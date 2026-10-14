// @ts-nocheck
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyDOqGbGhQg7y2dBXsZ7awlMbin6Faw7UUk',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'krawing-6797e.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'krawing-6797e',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'krawing-6797e.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '574280330576',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:574280330576:web:3a589b89853fe56b201055'
};

export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export default app;
