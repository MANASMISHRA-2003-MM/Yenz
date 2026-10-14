// @ts-nocheck
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from 'firebase/auth';
import { auth } from '../config/firebase';

const DEV_TEST_NUMBERS = [
  '+919999999999',
  '+919876543210',
  '+16505551234',
  '+16505553434'
];

/**
 * Standardizes any phone input string into valid E.164 format.
 * Defaults 10-digit Indian numbers to +91.
 */
export function formatPhoneNumberE164(phone: string): string {
  if (!phone) return '';
  const trimmed = phone.toString().trim();
  const digits = trimmed.replace(/\D/g, '');

  if (trimmed.startsWith('+')) {
    return `+${digits}`;
  }

  // Common India 10-digit mobile number
  if (digits.length === 10) {
    return `+91${digits}`;
  }

  // Pre-fixed with country code without plus (e.g. 919876543210)
  if (digits.length === 12 && digits.startsWith('91')) {
    return `+${digits}`;
  }

  return digits ? `+${digits}` : '';
}

/**
 * Clears active RecaptchaVerifier instance and cleans up its DOM container.
 */
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

/**
 * Manages RecaptchaVerifier lifecycle, recycling or creating instances cleanly.
 */
export function setupRecaptchaVerifier(
  containerId: string = 'recaptcha-container',
  size: 'invisible' | 'normal' = 'invisible'
): RecaptchaVerifier {
  if (typeof window === 'undefined') {
    throw new Error('reCAPTCHA cannot be initialized in a non-browser environment.');
  }

  const container = document.getElementById(containerId);
  if (!container) {
    throw new Error(`reCAPTCHA container element #${containerId} not found in DOM.`);
  }

  // If a verifier already exists, check if it matches the current size and container
  if (window.recaptchaVerifier) {
    const currentSize = (window.recaptchaVerifier as any).parameters?.size;
    const isDomAttached = container.hasChildNodes();

    if (currentSize === size && isDomAttached) {
      return window.recaptchaVerifier;
    }

    // Otherwise clear and recreate to avoid stale widget ID or mismatch
    clearRecaptcha(containerId);
  }

  const verifier = new RecaptchaVerifier(auth, containerId, {
    size: size,
    callback: () => {
      // reCAPTCHA solved by user or automatically passed
    },
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

/**
 * Sends Firebase phone OTP with 120s timeout, test number auto-detection,
 * and graceful fallback flags for invisible reCAPTCHA blockers.
 */
export async function sendPhoneOtp(
  phoneNumber: string,
  preferredSize: 'invisible' | 'normal' = 'invisible',
  timeoutMs: number = 120000
): Promise<SendOtpResult> {
  const formattedPhone = formatPhoneNumberE164(phoneNumber);
  if (!formattedPhone || formattedPhone.replace(/\D/g, '').length < 10) {
    throw new Error('Please enter a valid mobile phone number (at least 10 digits).');
  }

  const isTestNumber = DEV_TEST_NUMBERS.includes(formattedPhone) || formattedPhone.endsWith('9999999999');

  // Trigger Firebase's mock loader automatically for test numbers
  if (isTestNumber) {
    try {
      auth.settings.appVerificationDisabledForTesting = true;
    } catch (e) {
      console.warn('[PhoneAuth] Could not enable test mock verification:', e);
    }
  } else {
    try {
      auth.settings.appVerificationDisabledForTesting = false;
    } catch (e) {
      // Ignore
    }
  }

  const verifier = setupRecaptchaVerifier('recaptcha-container', preferredSize);

  try {
    await verifier.render();
  } catch (renderErr: any) {
    console.warn('[PhoneAuth] Verifier render warning:', renderErr);
    // If render fails, clear and attempt a fresh instance
    clearRecaptcha('recaptcha-container');
    const freshVerifier = setupRecaptchaVerifier('recaptcha-container', preferredSize);
    await freshVerifier.render();
  }

  const activeVerifier = window.recaptchaVerifier || verifier;

  // 120-second timeout matching Google's 2-minute reCAPTCHA lifespan
  const timeoutPromise = new Promise<never>((_, reject) => {
    const timer = setTimeout(() => {
      const timeoutErr: any = new Error(
        `reCAPTCHA verification timed out after ${Math.round(timeoutMs / 1000)} seconds. Please switch to the visible checkbox mode and try again.`
      );
      timeoutErr.code = 'auth/captcha-timeout';
      timeoutErr.canFallbackToVisible = preferredSize === 'invisible';
      reject(timeoutErr);
    }, timeoutMs);

    // Store timer on window so it can be cleared if needed
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

    // Flag error if invisible reCAPTCHA failed or timed out so UI can offer or auto-switch to visible checkbox
    const isCaptchaIssue =
      err.code === 'auth/captcha-timeout' ||
      err.code === 'auth/captcha-check-failed' ||
      err.code === 'auth/internal-error' ||
      err.code === 'auth/network-request-failed' ||
      (err.message && /recaptcha|timeout|network|blocked/i.test(err.message));

    if (preferredSize === 'invisible' && isCaptchaIssue) {
      err.canFallbackToVisible = true;
    }

    // Clean up verifier to allow retry
    clearRecaptcha('recaptcha-container');
    throw err;
  }
}
