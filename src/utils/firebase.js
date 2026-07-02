import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { getAnalytics, logEvent } from 'firebase/analytics';
import { getRemoteConfig, fetchAndActivate, getValue } from 'firebase/remote-config';
import { getStoreConfig } from '../services/storeApi';

const firebaseConfig = {
  apiKey: "AIzaSyD7wAemrF0TliAq77B-DeaxAi3XTPUfbkE",
  authDomain: "vatikart-app.firebaseapp.com",
  projectId: "vatikart-app",
  storageBucket: "vatikart-app.firebasestorage.app",
  messagingSenderId: "95815837864",
  appId: "1:95815837864:web:4378e3939bdaafb7e5ba9d",
  measurementId: "G-49ML5NKJM7"
};

let app = null;
let messaging = null;
let analytics = null;
let remoteConfig = null;

try {
  app = initializeApp(firebaseConfig);
  // Ensure we are in a browser environment with Service Worker support
  if (typeof window !== 'undefined') {
    if ('serviceWorker' in navigator) {
      messaging = getMessaging(app);
    }
    analytics = getAnalytics(app);
    remoteConfig = getRemoteConfig(app);
    
    // Set minimal settings for remote config (e.g. fetch interval)
    remoteConfig.settings.minimumFetchIntervalMillis = 3600000; // 1 hour
  }
} catch (err) {
  console.warn('[firebase] Init failed', err);
}

export async function requestNotificationPermissionAndGetToken(vapidKey = '') {
  if (!messaging) return null;

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.log('[firebase] Notification permission denied');
      return null;
    }

    // Register service worker explicitly
    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');

    const tokenOptions = {
      serviceWorkerRegistration: registration,
    };

    // Only add vapidKey if it is provided
    if (vapidKey) {
      tokenOptions.vapidKey = vapidKey;
    }

    const token = await getToken(messaging, tokenOptions);
    return token;
  } catch (err) {
    console.warn('[firebase] Error getting FCM web token', err);
    return null;
  }
}

export function onForegroundMessage(callback) {
  if (!messaging) return;
  return onMessage(messaging, (payload) => {
    console.log('[firebase] Foreground message received', payload);
    callback(payload);
  });
}

export function logStorefrontEvent(eventName, params = {}) {
  if (!analytics) return;
  try {
    logEvent(analytics, eventName, params);
  } catch (err) {
    console.warn('[firebase] Logging event failed', err);
  }
}

export async function initRemoteConfig() {
  if (!remoteConfig) return;
  try {
    await fetchAndActivate(remoteConfig);
    console.log('[firebase] Remote Config fetched and activated');
  } catch (err) {
    console.warn('[firebase] Remote Config fetch failed', err);
  }
}

export function getRemoteConfigValue(key) {
  if (!remoteConfig) return null;
  try {
    return getValue(remoteConfig, key).asString();
  } catch (err) {
    console.warn('[firebase] Get Remote Config value failed', err);
    return null;
  }
}
