// High-Performance Dedicated Audio & Haptic Engine
// Strictly uses /sounds/cash_register.wav for all active orders, delivery trips, and notifications
// Fully supports Android, iOS (Safari/Chrome), Web, Mobile, Tablets & Desktop

const SOUND_PATHS = ['/sounds/cash_register.wav', '/sound/cash_register.wav'];

let audioCtx = null;
let activeInterval = null;
let repeatTimeout = null;
let isAlertActive = false;
let audioUnlocked = false;

// Preloaded HTML5 Audio objects for instant zero-latency playback
let preloadedAudio = null;
let decodedAudioBuffer = null;

// Initialize or resume AudioContext safely across browsers
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

// Preload the cash register audio file
function initPreloadAudio() {
  if (typeof window === 'undefined') return;
  if (!preloadedAudio) {
    preloadedAudio = new Audio(SOUND_PATHS[0]);
    preloadedAudio.preload = 'auto';
    preloadedAudio.volume = 1.0;
    preloadedAudio.onerror = () => {
      // Fallback to secondary path if primary fails
      preloadedAudio.src = SOUND_PATHS[1];
      preloadedAudio.load();
    };
  }

  // Pre-fetch and decode cash_register.wav into Web Audio memory buffer
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

// Initialize preloading immediately on module load
if (typeof window !== 'undefined') {
  initPreloadAudio();
}

// Unlock audio on iOS Safari & strict autoplay browsers
export function unlockAudio() {
  try {
    initPreloadAudio();

    const ctx = getAudioContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    if (preloadedAudio) {
      // Warm up audio channel
      preloadedAudio.load();
    }

    audioUnlocked = true;
  } catch (e) {}
}

// Global user gesture listener to unlock audio on any touch/click event
if (typeof window !== 'undefined') {
  const unlockEvents = ['click', 'touchstart', 'touchend', 'keydown', 'pointerdown'];
  const handleUnlock = () => {
    unlockAudio();
  };
  unlockEvents.forEach((evt) =>
    window.addEventListener(evt, handleUnlock, { passive: true, once: false })
  );
}

/**
 * Cross-platform mobile & tablet haptic vibration
 * Distinctive multi-pulse vibration pattern for orders and rides
 */
export function triggerHaptics() {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      // Distinctive 5-pulse ring pattern: vibrate 500ms, pause 150ms...
      navigator.vibrate([500, 150, 500, 150, 500, 150, 1000]);
    } catch (e) {}
  }
}

/**
 * Play authentic /sounds/cash_register.wav sound
 * Strictly plays the actual recorded audio file — NO synthetic oscillator beeps.
 */
export function playCashRegisterSound() {
  try {
    triggerHaptics();

    // Strategy 1: Play via preloaded/new HTML5 Audio element
    let played = false;
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
          playPromise
            .then(() => {
              played = true;
            })
            .catch(() => {
              // If promise rejected due to autoplay, fall back to Web Audio buffer
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
    console.warn('[AlertSound] Play note:', err);
  }
}

// Fallback helper to play cash_register.wav directly from Web Audio buffer
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

// Alias for backwards compatibility
export const playChimeBeep = playCashRegisterSound;

/**
 * Action sound for user UI interactions (order updates, buttons)
 * Also plays the cash_register.wav sound
 */
export function playActionSound() {
  try {
    triggerHaptics();
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

/**
 * Start continuous repeating alert sound & haptics
 * Loops /sounds/cash_register.wav and vibration every 2.5s until vendor/rider accepts or dismisses
 */
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

/**
 * Stop sound and vibration immediately
 */
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
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(0);
    } catch (e) {}
  }
}
