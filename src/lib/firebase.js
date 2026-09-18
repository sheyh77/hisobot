import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBEmcaIAjnInJWATupAblylegei3b3-4GM",
  authDomain: "hisobot-app.firebaseapp.com",
  projectId: "hisobot-app",
  storageBucket: "hisobot-app.firebasestorage.app",
  messagingSenderId: "755495664608",
  appId: "1:755495664608:web:64bf6bceac916b07d10985",
  measurementId: "G-8SX7WL5LWR",
};

export const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);
