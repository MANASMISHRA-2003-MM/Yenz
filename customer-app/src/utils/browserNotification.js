// Native Browser Notification & Service Worker Bridge
import { playCashRegisterSound, triggerHaptics } from './alertSound';

let swRegistration = null;

// Register Service Worker on initial load
export async function initServiceWorker() {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js');
      swRegistration = reg;
      console.log('✅ Milega Food Service Worker registered:', reg.scope);
      return reg;
    } catch (err) {
      console.warn('Service worker registration note:', err.message);
    }
  }
  return null;
}

// Automatically request notification permissions from the user
export async function requestNotificationPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission !== 'denied') {
    try {
      const perm = await Notification.requestPermission();
      return perm;
    } catch (e) {
      return Notification.permission;
    }
  }

  return Notification.permission;
}

/**
 * Display native notification, play authentic Cash Register sound, and trigger haptic pulse.
 * Works even when the browser tab is minimized, in background, or the device screen is locked.
 */
export async function showBrowserAlert({ title, body, tag = 'milega-alert', url = '/' }) {
  // Always trigger sound and haptics
  playCashRegisterSound();
  triggerHaptics();

  if (typeof window === 'undefined' || !('Notification' in window)) {
    return;
  }

  if (Notification.permission === 'granted') {
    const options = {
      body: body || 'New incoming order or delivery alert!',
      icon: '/favicon.png',
      badge: '/favicon.png',
      tag,
      vibrate: [300, 100, 300, 100, 400],
      requireInteraction: true,
      data: { url }
    };

    try {
      if (swRegistration && swRegistration.showNotification) {
        await swRegistration.showNotification(title || '🚨 Milega Food Alert', options);
      } else {
        const notif = new Notification(title || '🚨 Milega Food Alert', options);
        notif.onclick = () => {
          window.focus();
          notif.close();
        };
      }
    } catch (err) {
      console.warn('Native notification display note:', err.message);
    }
  }
}
