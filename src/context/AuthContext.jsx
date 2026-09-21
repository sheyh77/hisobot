import React, { createContext, useContext, useEffect, useState } from "react";
import { api } from "../services/api";
import { registerWebPushToken } from "../services/messaging";

const AuthContext = createContext(null);
const normalizeUser = (user) => ({ ...user, uid: user.id, expiresAt: user.expiresAt || user.expires_at });

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!localStorage.getItem("moliyam-api-token")) { setLoading(false); return; }
    api.get("/api/me").then(({ user: profile }) => {
      const normalizedProfile = normalizeUser(profile);
      setUser(normalizedProfile);
      registerWebPushToken(normalizedProfile.id).catch(() => undefined);
    }).catch(() => localStorage.removeItem("moliyam-api-token")).finally(() => setLoading(false));
  }, []);

  const register = async (username, email, password) => {
    const result = await api.post("/api/auth/register", { username, email, password });
    localStorage.setItem("moliyam-api-token", result.token);
    setUser(normalizeUser(result.user));
  };

  const login = async (email, password) => {
    const result = await api.post("/api/auth/login", { email, password });
    localStorage.setItem("moliyam-api-token", result.token);
    const nextUser = normalizeUser(result.user);
    setUser(nextUser);
    registerWebPushToken(nextUser.id).catch(() => undefined);
    return nextUser;
  };

  const logout = () => { localStorage.removeItem("moliyam-api-token"); setUser(null); };
  const resetPassword = async () => { throw new Error("Parol tiklash uchun backend email provider hali sozlanmagan."); };
  const updateUser = async (updates) => { await api.patch("/api/me", updates); setUser((current) => ({ ...current, ...updates })); };

  return <AuthContext.Provider value={{ user, loading, register, login, logout, resetPassword, updateUser }}>{children}</AuthContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);
