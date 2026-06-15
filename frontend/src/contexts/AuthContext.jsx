import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { USER_TOKEN_KEY, authAPI, profileAPI } from "@/services/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  const hydrateFromStorage = useCallback(async () => {
    const t = localStorage.getItem(USER_TOKEN_KEY);
    if (!t) { setUser(null); return; }
    try {
      const payload = JSON.parse(atob(t.split(".")[1]));
      if (Date.now() >= payload.exp * 1000) {
        localStorage.removeItem(USER_TOKEN_KEY);
        setUser(null);
        return;
      }
      const base = { id: payload.sub, email: typeof payload.email === "string" ? payload.email : null };
      setUser(base);
      // Fetch profile to get first/last name
      try {
        const res = await profileAPI.getMe();
        if (res?.data) setUser({ ...base, firstName: res.data.firstName, lastName: res.data.lastName });
      } catch {}
    } catch {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    hydrateFromStorage();
  }, [hydrateFromStorage]);

  const login = async (email, password) => {
    const res = await authAPI.login(email, password);
    if (res?.token) {
      localStorage.setItem(USER_TOKEN_KEY, res.token);
      setUser(res.user || { id: null, email });
      // Fetch profile name after login
      try {
        const profile = await profileAPI.getMe();
        if (profile?.data) setUser(u => ({ ...u, firstName: profile.data.firstName, lastName: profile.data.lastName }));
      } catch {}
    }
    return res;
  };

  const logout = useCallback(() => {
    localStorage.removeItem(USER_TOKEN_KEY);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      login,
      logout,
      isAuthenticated: Boolean(user && localStorage.getItem(USER_TOKEN_KEY)),
      refreshSession: hydrateFromStorage,
    }),
    [user, logout, hydrateFromStorage]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
