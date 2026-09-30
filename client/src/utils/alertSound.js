// High-Performance Cross-Platform Audio Synthesizer & Haptic Engine
// Supports Android, iOS (Safari/Chrome), Web, Tablets, Linux, macOS & Windows

let audioCtx = null;
let activeInterval = null;
let repeatTimeout = null;
let isAlertActive = false;
let audioUnlocked = false;

// Initialize or resume AudioContext safely across browsers & OS platforms
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

// Play silent buffer to unlock AudioContext on iOS Safari & strict autoplay browsers
export function unlockAudio() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    // iOS Safari silent buffer unlock trick
    const buffer = ctx.createBuffer(1, 1, 22050);
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start(0);
    audioUnlocked = true;
  } catch (e) {}
}

// Global user gesture listener to unlock audio on any touch/click event anywhere on screen
if (typeof window !== 'undefined') {
  const unlockEvents = ['click', 'touchstart', 'touchend', 'keydown', 'pointerdown'];
  const handleUnlock = () => {
    unlockAudio();
  };
  unlockEvents.forEach(evt => window.addEventListener(evt, handleUnlock, { passive: true, once: false }));
}

// Loud, distinctive double-chime alarm sound for vendors, riders & consumers
export function playCashRegisterSound() {
  try {
    // 1. Direct HTML5 Audio playback attempt
    if (typeof Audio !== 'undefined') {
      try {
        const audio = new Audio('/sounds/cash_register.wav');
        audio.volume = 1.0;
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise.catch(() => {});
        }
      } catch (e) {}
    }

    // 2. High-Fidelity Web Audio Synthesizer (Guaranteed loud ring on all browsers)
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;

    // Alarm Tone 1: High Pitch Ring 880Hz -> 1760Hz
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'square';
    osc1.frequency.setValueAtTime(880, now);
    osc1.frequency.setValueAtTime(1760, now + 0.1);
    gain1.gain.setValueAtTime(0.35, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.35);

    // Alarm Tone 2: Echo Harmonic Ring 1320Hz -> 2640Hz
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(1320, now + 0.15);
    osc2.frequency.setValueAtTime(2640, now + 0.25);
    gain2.gain.setValueAtTime(0.45, now + 0.15);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.15);
    osc2.stop(now + 0.55);
  } catch (err) {
    console.warn('Audio ring note:', err);
  }
}

// Alias for backwards compatibility
export const playChimeBeep = playCashRegisterSound;

// Subtle action chime for user UI feedback
export function playActionSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(1046.5, now); // High C6
    osc.frequency.setValueAtTime(1318.5, now + 0.08); // E6

    gain.gain.setValueAtTime(0.25, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.3);
  } catch (e) {}
}

// Cross-platform mobile & tablet haptic vibration
export function triggerHaptics() {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate([500, 150, 500, 150, 500, 150, 1000]);
    } catch (e) {}
  }
}

// Start continuous repeating alert sound & haptics until user accepts/dismisses
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

// Stop sound and vibration immediately
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
