import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { refreshSession, setAccessToken, setAuthFailureHandler } from '../services/api';
import { authApi } from '../services/endpoints';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Session persistence: on page load, trade the HttpOnly refresh cookie for a fresh access token.
  useEffect(() => {
    let active = true;
    setAuthFailureHandler(() => setUser(null));
    (async () => {
      try {
        if (await refreshSession()) {
          const data = await authApi.me();
          if (active) setUser(data.user);
        }
      } catch {
        /* not signed in */
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const login = useCallback(async (email, password) => {
    const data = await authApi.login({ email, password });
    setAccessToken(data.accessToken);
    setUser(data.user);
  }, []);

  const register = useCallback(async (name, email, password) => {
    await authApi.register({ name, email, password });
    await login(email, password);
  }, [login]);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      setAccessToken(null);
      setUser(null);
    }
  }, []);

  const value = useMemo(() => ({ user, loading, login, register, logout }), [user, loading, login, register, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
