import { getMessaging, getToken, isSupported, onMessage } from "firebase/messaging";
import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { firebaseApp } from "../lib/firebase";
import { saveDeviceToken } from "./firestore";

let nativePushInitialized = false;

const registerNativePushToken = async () => {
  const permission = await PushNotifications.requestPermissions();
  if (permission.receive !== "granted") return null;
  if (!nativePushInitialized) {
    nativePushInitialized = true;
    await PushNotifications.addListener("registration", ({ value }) => saveDeviceToken(value, Capacitor.getPlatform()).catch(() => undefined));
    await PushNotifications.addListener("registrationError", () => undefined);
  }
  await PushNotifications.register();
  return true;
};

export const registerWebPushToken = async (userId) => {
  if (Capacitor.isNativePlatform()) return registerNativePushToken();
  const supported = await isSupported();
  const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
  if (!supported || !vapidKey || typeof navigator === "undefined") return null;
  const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
  const messaging = getMessaging(firebaseApp);
  const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: registration });
  if (token) await saveDeviceToken(token, "web");
  onMessage(messaging, (payload) => {
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
    const title = payload.notification?.title || "Moliyam";
    const body = payload.notification?.body || "";
    new Notification(title, { body, icon: "/images/apk_img.png", silent: false, renotify: true, tag: "moliyam-push" });
  });
  return token;
};
