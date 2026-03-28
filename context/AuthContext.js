"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const AuthContext = createContext(null);
const STORAGE_KEY = "cardportal_auth_v1";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [restoring, setRestoring] = useState(true);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const setSession = useCallback((nextUser) => {
    setUser(nextUser);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextUser));
  }, []);

  useEffect(() => {
    const restore = async () => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw);
        const res = await fetch("/api/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: parsed.email }),
        });
        if (!res.ok) throw new Error("Unable to validate existing session.");
        const data = await res.json();
        setUser({
          accountHolderId: data.accountHolderId,
          balanceAccountId: data.balanceAccountId,
          legalEntityId: data.legalEntityId,
          email: data.email,
          companyName: data.companyName,
        });
      } catch (_error) {
        localStorage.removeItem(STORAGE_KEY);
      } finally {
        setRestoring(false);
      }
    };
    restore();
  }, []);

  const value = useMemo(
    () => ({ user, restoring, setSession, logout }),
    [logout, restoring, setSession, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}

