/* eslint-disable react-refresh/only-export-components */
// Context quan ly trang thai auth context cho ung dung.
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { authApi } from "../api/authApi";
import { setUnauthorizedHandler } from "../api/httpClient";
import { clearTokens, setAccessToken } from "../api/tokenStore";

const AuthContext = createContext(null);

function getUserFromPayload(data) {
  return data?.user || data || null;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [bootstrapping, setBootstrapping] = useState(true);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Local cleanup is still required when server revoke fails.
    } finally {
      clearTokens();
      setUser(null);
    }
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => setUser(null));
    async function bootstrap() {
      try {
        const tokens = await authApi.refresh();
        setAccessToken(tokens?.accessToken);
        const profile = await authApi.me();
        setUser(getUserFromPayload(profile));
      } catch {
        clearTokens();
        setUser(null);
      } finally {
        setBootstrapping(false);
      }
    }
    bootstrap();
  }, []);

  const login = useCallback(async (payload) => {
    const tokens = await authApi.login(payload);
    setAccessToken(tokens?.accessToken);
    const profile = await authApi.me();
    const nextUser = getUserFromPayload(profile);
    setUser(nextUser);
    return nextUser;
  }, []);

  const refreshCurrentUser = useCallback(async () => {
    const profile = await authApi.me();
    const nextUser = getUserFromPayload(profile);
    setUser(nextUser);
    return nextUser;
  }, []);

  const value = useMemo(
    () => ({
      user,
      bootstrapping,
      isAuthenticated: Boolean(user),
      role: user?.role,
      login,
      logout,
      setUser,
      refreshCurrentUser,
      hasRole: (...roles) => roles.includes(user?.role),
    }),
    [bootstrapping, login, logout, refreshCurrentUser, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}
