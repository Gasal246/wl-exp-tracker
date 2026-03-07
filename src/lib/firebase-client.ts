import { getApps, initializeApp } from "firebase/app";
import { getMessaging, getToken, isSupported, onMessage, type MessagePayload } from "firebase/messaging";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

async function ensureMessaging() {
  const supported = await isSupported();
  if (!supported) return null;
  if (typeof window === "undefined") return null;

  const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  return getMessaging(app);
}

export async function fetchFcmToken() {
  if (!("Notification" in window)) return null;
  const messaging = await ensureMessaging();
  if (!messaging) return null;

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return null;

  const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
  if (!vapidKey) return null;

  return getToken(messaging, {
    vapidKey,
    serviceWorkerRegistration: await navigator.serviceWorker.register("/firebase-messaging-sw.js"),
  });
}

export async function subscribeToForegroundFcm(onPayload: (payload: MessagePayload) => void) {
  if (!("Notification" in window)) return () => {};
  if (Notification.permission !== "granted") return () => {};

  const messaging = await ensureMessaging();
  if (!messaging) return () => {};

  return onMessage(messaging, onPayload);
}
