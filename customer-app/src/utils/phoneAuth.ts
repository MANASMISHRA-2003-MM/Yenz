// @ts-nocheck
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from 'firebase/auth';
import { auth } from '../config/firebase';

const DEV_TEST_NUMBERS = [
  '+919999999999',
  '+919876543210',
  '+16505551234',
  '+16505553434'
];

export function formatPhoneNumberE164(phone: string): string {
  if (!phone) return '';
  const trimmed = phone.toString().trim();
  const digits = trimmed.replace(/\D/g, '');

  if (trimmed.startsWith('+')) {
    return `+${digits}`;
  }

  if (digits.length === 10) {
    return `+91${digits}`;
  }

  if (digits.length === 12 && digits.startsWith('91')) {
    return `+${digits}`;
  }

  return digits ? `+${digits}` : '';
}

export function clearRecaptcha(containerId: string = 'recaptcha-container'): void {
  try {
    if (typeof window !== 'undefined' && window.recaptchaVerifier) {
      if (typeof window.recaptchaVerifier.clear === 'function') {
        window.recaptchaVerifier.clear();
      }
      window.recaptchaVerifier = null;
      window.recaptchaWidgetId = null;
    }

    if (typeof document !== 'undefined') {
      const container = document.getElementById(containerId);
      if (container) {
        container.innerHTML = '';
      }
    }
  } catch (err) {
    console.warn('[PhoneAuth] Warning while clearing recaptcha:', err);
  }
}

export function setupRecaptchaVerifier(
  containerId: string = 'recaptcha-container',
  size: 'invisible' | 'normal' = 'invisible'
): RecaptchaVerifier {
  if (typeof window === 'undefined') {
    throw new Error('reCAPTCHA cannot be initialized outside the browser.');
  }

  const container = document.getElementById(containerId);
  if (!container) {
    throw new Error(`reCAPTCHA container element #${containerId} not found in DOM.`);
  }

  if (window.recaptchaVerifier) {
    const currentSize = (window.recaptchaVerifier as any).parameters?.size;
    const isDomAttached = container.hasChildNodes();

    if (currentSize === size && isDomAttached) {
      return window.recaptchaVerifier;
    }
    clearRecaptcha(containerId);
  }

  const verifier = new RecaptchaVerifier(auth, containerId, {
    size: size,
    callback: () => {},
    'expired-callback': () => {
      clearRecaptcha(containerId);
    }
  });

  window.recaptchaVerifier = verifier;
  return verifier;
}

export interface SendOtpResult {
  confirmationResult: ConfirmationResult;
  formattedPhone: string;
  isTestNumber: boolean;
}

export async function sendPhoneOtp(
  phoneNumber: string,
  preferredSize: 'invisible' | 'normal' = 'invisible',
  timeoutMs: number = 120000
): Promise<SendOtpResult> {
  const formattedPhone = formatPhoneNumberE164(phoneNumber);
  if (!formattedPhone || formattedPhone.replace(/\D/g, '').length < 10) {
    throw new Error('Please enter a valid mobile phone number (at least 10 digits).');
  }

export function isTestPhoneNumber(phone: string): boolean {
  if (!phone) return false;
  const digits = phone.toString().replace(/\D/g, '');
  return (
    digits.startsWith('9199999999') ||
    digits.startsWith('99999999') ||
    digits === '9876543210' ||
    digits === '919876543210' ||
    digits.startsWith('1650555') ||
    DEV_TEST_NUMBERS.includes(phone)
  );
}

  const isTestNumber = isTestPhoneNumber(formattedPhone);

  if (isTestNumber) {
    try {
      auth.settings.appVerificationDisabledForTesting = true;
    } catch (e) {
      console.warn('[PhoneAuth] Could not enable test mock verification:', e);
    }
  } else {
    try {
      auth.settings.appVerificationDisabledForTesting = false;
    } catch (e) {}
  }

  const verifier = setupRecaptchaVerifier('recaptcha-container', preferredSize);

  try {
    await verifier.render();
  } catch (renderErr: any) {
    clearRecaptcha('recaptcha-container');
    const freshVerifier = setupRecaptchaVerifier('recaptcha-container', preferredSize);
    await freshVerifier.render();
  }

  const activeVerifier = window.recaptchaVerifier || verifier;

  const timeoutPromise = new Promise<never>((_, reject) => {
    const timer = setTimeout(() => {
      const timeoutErr: any = new Error(
        `reCAPTCHA verification timed out after ${Math.round(timeoutMs / 1000)}s. Please try again with visible checkbox.`
      );
      timeoutErr.code = 'auth/captcha-timeout';
      timeoutErr.canFallbackToVisible = preferredSize === 'invisible';
      reject(timeoutErr);
    }, timeoutMs);

    (window as any).__otpTimeoutTimer = timer;
  });

  try {
    const confirmationResult = await Promise.race([
      signInWithPhoneNumber(auth, formattedPhone, activeVerifier),
      timeoutPromise
    ]);

    if ((window as any).__otpTimeoutTimer) {
      clearTimeout((window as any).__otpTimeoutTimer);
    }

    window.confirmationResult = confirmationResult;

    return {
      confirmationResult,
      formattedPhone,
      isTestNumber
    };
  } catch (err: any) {
    if ((window as any).__otpTimeoutTimer) {
      clearTimeout((window as any).__otpTimeoutTimer);
    }

    const isCaptchaIssue =
      err.code === 'auth/captcha-timeout' ||
      err.code === 'auth/captcha-check-failed' ||
      err.code === 'auth/internal-error' ||
      err.code === 'auth/network-request-failed' ||
      (err.message && /recaptcha|timeout|network|blocked/i.test(err.message));

    if (preferredSize === 'invisible' && isCaptchaIssue) {
      err.canFallbackToVisible = true;
    }

    clearRecaptcha('recaptcha-container');
    throw err;
  }
}
