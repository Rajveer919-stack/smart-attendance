import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import api from '../api/axios';

// Login hamesha yaad rehta hai: app band karo, phone restart karo, tab bhi.
// Sirf Logout dabane par ya password badalne par hi login hatega.

const AuthContext = createContext(null);
const TOKEN_KEY = 'token';
const USER_KEY = 'user';

// Server ke ye jawab batate hai ki login (token) sach me kharab hai
const TOKEN_ERRORS = [
  'Token invalid ya expire ho gaya',
  'User exist nahi karta',
  'Login karo pehle (token nahi mila)',
];

function readStore(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStore(key, value) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // browser save nahi karne de raha
  }
}

function readCachedUser() {
  const raw = readStore(USER_KEY);
  if (!raw || !readStore(TOKEN_KEY)) return null;
  try {
    const u = JSON.parse(raw);
    return u && u.role ? u : null;
  } catch {
    return null;
  }
}

function setAuthHeader(token) {
  if (token) api.defaults.headers.common.Authorization = 'Bearer ' + token;
  else delete api.defaults.headers.common.Authorization;
}

// Browser se kaho ki ye data na mitaye (storage kam padne par bhi)
function keepStorage() {
  try {
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist();
  } catch {
    // koi baat nahi
  }
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export function AuthProvider({ children }) {
  const cached = useRef(readCachedUser()).current;
  const [user, setUser] = useState(cached);
  // Pehle se login ka nishan hai to turant dashboard dikhao, piche se check hota rahega
  const [loading, setLoading] = useState(() => !!readStore(TOKEN_KEY) && !cached);

  const clearLogin = useCallback(() => {
    writeStore(TOKEN_KEY, null);
    writeStore(USER_KEY, null);
    setAuthHeader(null);
    setUser(null);
  }, []);

  const logout = useCallback(() => {
    clearLogin();
  }, [clearLogin]);

  const login = useCallback(async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    writeStore(TOKEN_KEY, data.token);
    writeStore(USER_KEY, JSON.stringify(data.user));
    setAuthHeader(data.token);
    setUser(data.user);
    keepStorage();
    return data.user;
  }, []);

  // Token sach me kharab ho to hi logout (server band/so raha ho to nahi)
  useEffect(() => {
    const id = api.interceptors.response.use(
      (res) => res,
      (err) => {
        const status = err.response && err.response.status;
        const message = err.response && err.response.data && err.response.data.message;
        if (status === 401 && readStore(TOKEN_KEY) && TOKEN_ERRORS.includes(message)) {
          clearLogin();
        }
        return Promise.reject(err);
      }
    );
    return () => api.interceptors.response.eject(id);
  }, [clearLogin]);

  // App khulte hi: saved login se server se naya haal lo
  useEffect(() => {
    const token = readStore(TOKEN_KEY);
    if (!token) {
      setLoading(false);
      return undefined;
    }
    setAuthHeader(token);
    keepStorage();

    let stopped = false;
    (async () => {
      // Render ka server so raha ho to jagne me der lagti hai, isliye kai baar koshish
      for (let attempt = 0; attempt < 8 && !stopped; attempt += 1) {
        try {
          const { data } = await api.get('/auth/me');
          if (stopped) return;
          writeStore(USER_KEY, JSON.stringify(data.user));
          setUser(data.user);
          setLoading(false);
          return;
        } catch (err) {
          const status = err.response && err.response.status;
          if (status === 401) {
            // interceptor logout kar chuka hoga
            if (!stopped) setLoading(false);
            return;
          }
          await wait(Math.min(2000 * (attempt + 1), 8000));
        }
      }
      // Server nahi mila: login mat hatao, bas loading band karo
      if (!stopped) setLoading(false);
    })();

    return () => {
      stopped = true;
    };
  }, []);

  // Dusre tab me logout hua to yaha bhi
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === TOKEN_KEY && !e.newValue) {
        setAuthHeader(null);
        setUser(null);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const value = useMemo(() => ({ user, loading, login, logout }), [user, loading, login, logout]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}