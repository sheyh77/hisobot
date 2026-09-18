import React, { createContext, useContext, useEffect, useState } from "react";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth";
import { auth } from "../lib/firebase";
import { getUserProfile, saveUserProfile } from "../services/firestore";
import { registerWebPushToken } from "../services/messaging";

const AuthContext = createContext(null);

const toAppUser = (firebaseUser, profile) => ({
  id: firebaseUser.uid,
  uid: firebaseUser.uid,
  email: firebaseUser.email,
  username: profile?.username || firebaseUser.displayName || firebaseUser.email?.split("@")[0],
  role: profile?.role || "user",
  ...profile,
});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => onAuthStateChanged(auth, async (firebaseUser) => {
    if (!firebaseUser) {
      setUser(null);
      setLoading(false);
      return;
    }
    let profile = null;
    try {
      profile = await getUserProfile(firebaseUser.uid);
    } catch (error) {
      console.error("Firebase profile permissions error:", error);
    }
    setUser(toAppUser(firebaseUser, profile));
    registerWebPushToken(firebaseUser.uid).catch(() => {});
    setLoading(false);
  }), []);

  const register = async (username, email, password) => {
    try {
      const credential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      await updateProfile(credential.user, { displayName: username.trim() });
      await saveUserProfile(credential.user.uid, { username: username.trim(), email: email.trim(), role: "user", createdAt: new Date().toISOString() });
      setUser(toAppUser(credential.user, { username: username.trim(), email: email.trim(), role: "user" }));
    } catch (error) {
      const messages = {
        "auth/email-already-in-use": "Bu email allaqachon ro'yxatdan o'tgan.",
        "auth/invalid-email": "Email manzil noto'g'ri yozilgan.",
        "auth/weak-password": "Parol kamida 6 ta belgidan iborat bo'lishi kerak.",
        "auth/operation-not-allowed": "Firebase Console'da Email/Password login yoqilmagan.",
        "auth/network-request-failed": "Internet aloqasini tekshiring.",
      };
      throw new Error(messages[error.code] || `Ro'yxatdan o'tishda Firebase xatosi: ${error.code || "noma'lum"}`);
    }
  };

  const login = async (email, password) => {
    const authEmail = email.includes("@") ? email : `${email}@hisobot-app.firebaseapp.com`;
    try {
      const credential = await signInWithEmailAndPassword(auth, authEmail, password);
      const profile = await getUserProfile(credential.user.uid);
      const nextUser = toAppUser(credential.user, profile);
      setUser(nextUser);
      return nextUser;
    } catch (error) {
      const messages = {
        "auth/invalid-credential": "Login yoki parol noto'g'ri.",
        "auth/user-not-found": "Bu login Firebase'da topilmadi.",
        "auth/wrong-password": "Parol noto'g'ri.",
        "auth/operation-not-allowed": "Firebase Console'da Email/Password login yoqilmagan.",
        "auth/too-many-requests": "Ko'p urinish bo'ldi. Birozdan keyin qayta urinib ko'ring.",
      };
      throw new Error(messages[error.code] || `Firebase login xatosi: ${error.code || "noma'lum"}`);
    }
  };

  const logout = () => signOut(auth);

  const updateUser = async (updates) => {
    if (!user) return;
    await saveUserProfile(user.id, updates);
    setUser((currentUser) => ({ ...currentUser, ...updates }));
  };

  return <AuthContext.Provider value={{ user, loading, register, login, logout, updateUser }}>{children}</AuthContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);
