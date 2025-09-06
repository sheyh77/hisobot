// src/context/AuthContext.jsx
import React, { createContext, useState, useEffect, useContext } from "react";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // <-- loading state qo‘shdik

  // localStorage dan userni olish
  useEffect(() => {
    const savedUser = localStorage.getItem("user");
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false); // <-- user o‘qilgach loading false bo‘ladi
  }, []);

  // Register
  const register = async (username, password) => {
    try {
      const res = await fetch("https://a139ac647c5e2feb.mokky.dev/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (!res.ok) {
        throw new Error("Foydalanuvchini ro‘yxatdan o‘tkazishda xatolik");
      }

      const newUser = await res.json();
      setUser(newUser);
      localStorage.setItem("user", JSON.stringify(newUser));
    } catch (error) {
      console.error("Register error:", error);
    }
  };

  // Login
  const login = async (username, password) => {
    try {
      const res = await fetch(
        `https://a139ac647c5e2feb.mokky.dev/users?username=${username}&password=${password}`
      );

      if (!res.ok) {
        throw new Error("Login qilishda xatolik");
      }

      const data = await res.json();

      if (data.length > 0) {
        setUser(data[0]);
        localStorage.setItem("user", JSON.stringify(data[0]));
        return true;
      } else {
        return false;
      }
    } catch (error) {
      console.error("Login error:", error);
      return false;
    }
  };

  // Logout
  const logout = () => {
    setUser(null);
    localStorage.removeItem("user");
  };

  return (
    <AuthContext.Provider value={{ user, loading, register, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// useAuth hook
export const useAuth = () => useContext(AuthContext);
