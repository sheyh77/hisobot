import React, { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthContext";
import { getUserProfile } from "../services/firestore";

const SubscriptionContext = createContext(null);

export const SubscriptionProvider = ({ children }) => {
  const { user } = useAuth();
  const [state, setState] = useState({ status: "LOADING", plan: "free", expiresAt: null });

  useEffect(() => {
    let active = true;
    if (!user) {
      setState({ status: "FREE", plan: "free", expiresAt: null });
      return () => { active = false; };
    }
    setState((current) => ({ ...current, status: "LOADING" }));
    getUserProfile(user.id).then((profile) => {
      if (!active) return;
      const isValidPro = profile?.plan === "pro" && (!profile.expiresAt || new Date(profile.expiresAt) > new Date());
      setState({ status: isValidPro ? "PRO" : "FREE", plan: isValidPro ? "pro" : "free", expiresAt: isValidPro ? profile.expiresAt || null : null });
    }).catch(() => {
      if (active) setState({ status: "UNKNOWN", plan: "free", expiresAt: null });
    });
    return () => { active = false; };
  }, [user]);

  return <SubscriptionContext.Provider value={{ ...state, isPro: state.status === "PRO", refreshEntitlement: async () => user && getUserProfile(user.id) }}>{children}</SubscriptionContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useSubscription = () => useContext(SubscriptionContext);
