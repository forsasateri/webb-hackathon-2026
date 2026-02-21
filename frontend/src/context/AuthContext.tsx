import { createContext, useContext, useReducer, useEffect, useCallback, type ReactNode } from 'react';
import { login as apiLogin, register as apiRegister, getCurrentUser } from '../api/auth';
import type { UserResponse, TokenResponse } from '../types/course';

// ── State ──
interface AuthState {
  user: UserResponse | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
}

const initialState: AuthState = {
  user: null,
  token: localStorage.getItem('token'),
  isAuthenticated: false,
  loading: true, // start loading until we verify token
};

// ── Actions ──
type AuthAction =
  | { type: 'LOGIN_SUCCESS'; token: string; user: UserResponse }
  | { type: 'SET_USER'; user: UserResponse }
  | { type: 'LOGOUT' }
  | { type: 'SET_LOADING'; loading: boolean };

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'LOGIN_SUCCESS':
      return {
        ...state,
        user: action.user,
        token: action.token,
        isAuthenticated: true,
        loading: false,
      };
    case 'SET_USER':
      return {
        ...state,
        user: action.user,
        isAuthenticated: true,
        loading: false,
      };
    case 'LOGOUT':
      return {
        ...state,
        user: null,
        token: null,
        isAuthenticated: false,
        loading: false,
      };
    case 'SET_LOADING':
      return { ...state, loading: action.loading };
    default:
      return state;
  }
}

// ── Context ──
interface AuthContextValue extends AuthState {
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// ── Provider ──
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // On mount: if token exists, verify it via /auth/me
  useEffect(() => {
    const verifyToken = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        dispatch({ type: 'SET_LOADING', loading: false });
        return;
      }
      try {
        const user = await getCurrentUser();
        dispatch({ type: 'SET_USER', user });
      } catch {
        // Token invalid – clean up
        localStorage.removeItem('token');
        dispatch({ type: 'LOGOUT' });
      }
    };
    verifyToken();
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    const data: TokenResponse = await apiLogin(username, password);
    localStorage.setItem('token', data.access_token);
    dispatch({ type: 'LOGIN_SUCCESS', token: data.access_token, user: data.user });
  }, []);

  const register = useCallback(async (username: string, email: string, password: string) => {
    // Register then auto-login
    await apiRegister(username, email, password);
    await login(username, password);
  }, [login]);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    dispatch({ type: 'LOGOUT' });
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// ── Hook ──
export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
