// Native Browser Notification & Service Worker Bridge for Vendor App
import { playCashRegisterSound, triggerHaptics } from './alertSound';

let swRegistration = null;

export async function initServiceWorker() {
  if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js');
      swRegistration = reg;
      return reg;
    } catch (err) {
      console.warn('Service worker note:', err.message);
    }
  }
  return null;
}

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

export async function showBrowserAlert({ title, body, tag = 'milega-vendor-alert', url = '/vendor/dashboard' }) {
  playCashRegisterSound();
  triggerHaptics();

  if (typeof window === 'undefined' || !('Notification' in window)) {
    return;
  }

  if (Notification.permission === 'granted') {
    const options = {
      body: body || 'New incoming order alert!',
      icon: '/favicon.png',
      badge: '/favicon.png',
      tag,
      vibrate: [500, 150, 500, 150, 1000],
      requireInteraction: true,
      data: { url }
    };

    try {
      if (swRegistration && swRegistration.showNotification) {
        await swRegistration.showNotification(title || '🚨 Milega Vendor Alert', options);
      } else {
        const notif = new Notification(title || '🚨 Milega Vendor Alert', options);
        notif.onclick = () => {
          window.focus();
          notif.close();
        };
      }
    } catch (err) {
      console.warn('Notification display note:', err.message);
    }
  }
}
