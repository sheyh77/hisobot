// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAbE4y6qs9IemV2qdVv1VsdU1VBZsP8IhQ",
  authDomain: "hisobot-app.firebaseapp.com",
  projectId: "hisobot-app",
  storageBucket: "hisobot-app.firebasestorage.app",
  messagingSenderId: "755495664608",
  appId: "1:755495664608:web:7b977583b0e2f772d10985",
  measurementId: "G-H239LTJGRC"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);