import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';

const TOKEN_KEY = 'erp_auth_token';
const USER_KEY = 'erp_auth_user';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  });
  const [isChecking, setIsChecking] = useState(Boolean(token));

  useEffect(() => {
    if (!token) {
      setIsChecking(false);
      return;
    }

    api
      .get('/auth/me')
      .then((me) => {
        setUser(me);
      })
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        setToken(null);
        setUser(null);
      })
      .finally(() => setIsChecking(false));
  }, [token]);

  async function login({ username, password }) {
    const result = await api.post('/auth/login', { username, password }, { skipAuth: true });
    localStorage.setItem(TOKEN_KEY, result.token);
    localStorage.setItem(USER_KEY, JSON.stringify(result.user));
    setToken(result.token);
    setUser(result.user);
    return result.user;
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setToken(null);
    setUser(null);
  }

  const value = useMemo(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(token),
      isChecking,
      login,
      logout
    }),
    [user, token, isChecking]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
