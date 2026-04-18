import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { api, setAuthToken, setOnUnauthorized } from '../services/api';

interface AuthUser {
  id: string;
  username: string;
  role: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: AuthUser | null;
  token: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: (message?: string) => void;
  isLoading: boolean;
  sessionMessage: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionMessage, setSessionMessage] = useState<string | null>(null);

  // Restore session from localStorage on mount
  useEffect(() => {
    const storedToken = localStorage.getItem(TOKEN_KEY);
    const storedUser = localStorage.getItem(USER_KEY);

    if (storedToken && storedUser) {
      try {
        const parsed = JSON.parse(storedUser) as AuthUser;
        setToken(storedToken);
        setUser(parsed);
        setAuthToken(storedToken);
      } catch {
        // Corrupted data — clear it
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
      }
    }
    setIsLoading(false);
  }, []);

  const logout = useCallback((message?: string) => {
    setToken(null);
    setUser(null);
    setAuthToken(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem('isAuthenticated');
    if (message) {
      setSessionMessage(message);
    }
  }, []);

  // Register a 401 handler with the API client.
  // This avoids monkey-patching window.fetch (which would interfere with
  // any other fetch caller and could double-wrap on re-mounts).
  useEffect(() => {
    setOnUnauthorized(() => {
      logout('Sesión expirada. Inicia sesión nuevamente.');
    });
    return () => {
      setOnUnauthorized(null);
    };
  }, [logout]);

  const login = useCallback(
    async (username: string, password: string) => {
      setSessionMessage(null);
      const response = await api.login(username, password);

      setToken(response.token);
      setUser(response.user);
      setAuthToken(response.token);
      localStorage.setItem(TOKEN_KEY, response.token);
      localStorage.setItem(USER_KEY, JSON.stringify(response.user));
    },
    [],
  );

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated: !!token && !!user,
        user,
        token,
        login,
        logout,
        isLoading,
        sessionMessage,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
