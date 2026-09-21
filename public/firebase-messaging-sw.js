// public/firebase-messaging-sw.js
importScripts("https://www.gstatic.com/firebasejs/9.6.10/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/9.6.10/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyBEmcaIAjnInJWATupAblylegei3b3-4GM",
  authDomain: "hisobot-app.firebaseapp.com",
  projectId: "hisobot-app",
  storageBucket: "hisobot-app.firebasestorage.app",
  messagingSenderId: "755495664608",
  appId: "1:755495664608:web:64bf6bceac916b07d10985",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log("📩 Orqa fonda kelgan xabar:", payload);
  self.registration.showNotification(payload.notification.title, {
    body: payload.notification.body,
    icon: "/images/apk_img.png",
    silent: false,
    renotify: true,
    vibrate: [200, 100, 200],
    tag: "moliyam-push",
  });
});
