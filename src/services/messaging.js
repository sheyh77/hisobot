import { getMessaging, getToken, isSupported } from "firebase/messaging";
import { firebaseApp } from "../lib/firebase";
import { saveUserProfile } from "./firestore";

export const registerWebPushToken = async (userId) => {
  const supported = await isSupported();
  const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
  if (!supported || !vapidKey || typeof navigator === "undefined") return null;
  const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
  const messaging = getMessaging(firebaseApp);
  const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: registration });
  if (token) await saveUserProfile(userId, { fcmToken: token });
  return token;
};
