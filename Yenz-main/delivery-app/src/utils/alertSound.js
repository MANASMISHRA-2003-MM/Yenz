// High-Performance Dedicated Audio & Haptic Engine for Vendor App
// Uses /sounds/cash_register.wav + Capacitor Native Haptics & Web Audio
import { Haptics, ImpactStyle } from '@capacitor/haptics';

const SOUND_PATHS = ['/sounds/cash_register.wav', '/sound/cash_register.wav'];

let audioCtx = null;
let activeInterval = null;
let repeatTimeout = null;
let isAlertActive = false;
let audioUnlocked = false;

let preloadedAudio = null;
let decodedAudioBuffer = null;

export function getAudioContext() {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().then(() => {
      audioUnlocked = true;
    }).catch(() => {});
  } else if (audioCtx && audioCtx.state === 'running') {
    audioUnlocked = true;
  }
  return audioCtx;
}

function initPreloadAudio() {
  if (typeof window === 'undefined') return;
  if (!preloadedAudio) {
    preloadedAudio = new Audio(SOUND_PATHS[0]);
    preloadedAudio.preload = 'auto';
    preloadedAudio.volume = 1.0;
    preloadedAudio.onerror = () => {
      preloadedAudio.src = SOUND_PATHS[1];
      preloadedAudio.load();
    };
  }

  if (!decodedAudioBuffer) {
    try {
      fetch(SOUND_PATHS[0])
        .then((res) => {
          if (!res.ok) return fetch(SOUND_PATHS[1]);
          return res;
        })
        .then((res) => res.arrayBuffer())
        .then((arrayBuffer) => {
          const ctx = getAudioContext();
          if (ctx) {
            ctx.decodeAudioData(arrayBuffer, (decoded) => {
              decodedAudioBuffer = decoded;
            }, () => {});
          }
        })
        .catch(() => {});
    } catch (e) {}
  }
}

if (typeof window !== 'undefined') {
  initPreloadAudio();
}

export function unlockAudio() {
  try {
    initPreloadAudio();
    const ctx = getAudioContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    if (preloadedAudio) {
      preloadedAudio.load();
    }
    audioUnlocked = true;
  } catch (e) {}
}

let userHasInteracted = false;
if (typeof window !== 'undefined') {
  const unlockEvents = ['click', 'touchstart', 'touchend', 'keydown', 'pointerdown'];
  const handleUnlock = () => {
    userHasInteracted = true;
    unlockAudio();
  };
  unlockEvents.forEach((evt) =>
    window.addEventListener(evt, handleUnlock, { passive: true })
  );
}

export async function triggerHaptics() {
  // Try Capacitor native haptics first
  try {
    await Haptics.vibrate({ duration: 800 });
    return;
  } catch (e) {
    // Fallback to web vibration
  }

  try {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([500, 150, 500, 150, 500, 150, 1000]);
    }
  } catch (e) {}
}

export function playCashRegisterSound() {
  try {
    triggerHaptics();
    if (typeof Audio !== 'undefined') {
      try {
        const audio = new Audio(SOUND_PATHS[0]);
        audio.volume = 1.0;
        audio.onerror = () => {
          audio.src = SOUND_PATHS[1];
          audio.play().catch(() => {});
        };
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.catch(() => {
            playFromDecodedBuffer();
          });
        }
      } catch (e) {
        playFromDecodedBuffer();
      }
    } else {
      playFromDecodedBuffer();
    }
  } catch (err) {
    console.warn('[AlertSound] Note:', err);
  }
}

function playFromDecodedBuffer() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
    if (decodedAudioBuffer) {
      const source = ctx.createBufferSource();
      const gainNode = ctx.createGain();
      gainNode.gain.setValueAtTime(1.0, ctx.currentTime);
      source.buffer = decodedAudioBuffer;
      source.connect(gainNode);
      gainNode.connect(ctx.destination);
      source.start(0);
    }
  } catch (e) {}
}

export const playChimeBeep = playCashRegisterSound;

export function playActionSound() {
  try {
    try {
      Haptics.impact({ style: ImpactStyle.Medium });
    } catch (e) {}

    if (typeof Audio !== 'undefined') {
      const audio = new Audio(SOUND_PATHS[0]);
      audio.volume = 0.8;
      audio.onerror = () => {
        audio.src = SOUND_PATHS[1];
        audio.play().catch(() => {});
      };
      const p = audio.play();
      if (p !== undefined) p.catch(() => {});
    } else {
      playFromDecodedBuffer();
    }
  } catch (e) {}
}

export function startRepeatingAlert(onTriggerCallback) {
  stopAlertSound();
  isAlertActive = true;

  unlockAudio();
  playCashRegisterSound();
  triggerHaptics();
  if (onTriggerCallback) onTriggerCallback();

  activeInterval = setInterval(() => {
    if (!isAlertActive) {
      clearInterval(activeInterval);
      activeInterval = null;
      return;
    }
    playCashRegisterSound();
    triggerHaptics();
  }, 2500);
}

export function stopAlertSound() {
  isAlertActive = false;
  if (activeInterval) {
    clearInterval(activeInterval);
    activeInterval = null;
  }
  if (repeatTimeout) {
    clearTimeout(repeatTimeout);
    repeatTimeout = null;
  }
  try {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(0);
    }
  } catch (e) {}
}
