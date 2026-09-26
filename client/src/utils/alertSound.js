// Web Audio API Synthesizer & Haptics Alert System for Vendors & Delivery Riders

let audioCtx = null;
let activeInterval = null;
let repeatTimeout = null;
let isAlertActive = false;

function getAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

// Play a single 0.4s urgent dual-tone beep chime
export function playChimeBeep() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, ctx.currentTime); // A5 note

    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(1046.5, ctx.currentTime); // C6 note

    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    osc1.start(ctx.currentTime);
    osc2.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.4);
    osc2.stop(ctx.currentTime + 0.4);
  } catch (err) {
    console.warn('Audio chime play warning:', err);
  }
}

// Trigger haptic vibration pattern
export function triggerHaptics() {
  if ('vibrate' in navigator) {
    try {
      navigator.vibrate([300, 100, 300, 100, 300, 100, 300]);
    } catch (e) {
      // Ignore fallback
    }
  }
}

// Play alert sequence: Rings for 20 seconds at 2-second intervals
export function start20SecAlertSequence(onFinish) {
  stopAlertSound();
  isAlertActive = true;

  let elapsedSeconds = 0;
  playChimeBeep();
  triggerHaptics();

  activeInterval = setInterval(() => {
    elapsedSeconds += 2;
    if (elapsedSeconds >= 20 || !isAlertActive) {
      clearInterval(activeInterval);
      activeInterval = null;
      if (onFinish) onFinish();
    } else {
      playChimeBeep();
      triggerHaptics();
    }
  }, 2000);
}

// Start repeating alert: 20s ring -> wait 60s -> 20s ring -> repeat until stopped
export function startRepeatingAlert(onTriggerCallback) {
  stopAlertSound();
  isAlertActive = true;

  const runCycle = () => {
    if (!isAlertActive) return;

    if (onTriggerCallback) onTriggerCallback();

    start20SecAlertSequence(() => {
      if (!isAlertActive) return;
      // Wait 60 seconds (1 minute) before repeating the 20s alert
      repeatTimeout = setTimeout(() => {
        if (isAlertActive) runCycle();
      }, 60000);
    });
  };

  runCycle();
}

// Stop sound chime & vibration sequence immediately
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
  if ('vibrate' in navigator) {
    try {
      navigator.vibrate(0);
    } catch (e) {}
  }
}
