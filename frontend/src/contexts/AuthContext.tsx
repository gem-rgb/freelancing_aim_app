'use client';

import React, { createContext, useContext, useReducer, useEffect, ReactNode, useCallback, useMemo } from 'react';
import { apiService } from '@/utils/api';
import { EncryptionService } from '@/utils/encryption';

interface User {
  id: number;
  username: string;
  user_type: 'buyer' | 'seller' | 'manager';
  public_key: string;
  reputation_score: number;
  stake_balance: number;
  is_verified: boolean;
  is_staff: boolean;
  is_suspended: boolean;
  created_at: string;
  updated_at: string;
  wallet_balance: number;
  frozen_balance: number;
  wallet_address: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

interface AuthContextType extends AuthState {
  login: (username: string, password: string) => Promise<any>;
  staffLogin: (username: string, password: string) => Promise<any>;
  register: (userData: {
    username: string;
    password: string;
    confirm_password: string;
    user_type: 'buyer' | 'seller' | 'manager';
    email?: string;
    public_key?: string;
    encrypted_private_key?: string;
  }) => Promise<any>;   // returns { user, tokens, requires_otp }
  logout: () => Promise<void>;
  generateKeys: () => Promise<{ publicKey: string; privateKey: string }>;
  generateUsername: () => Promise<string>;
  clearError: () => void;
}

type AuthAction =
  | { type: 'LOGIN_START' }
  | { type: 'LOGIN_SUCCESS'; payload: User }
  | { type: 'LOGIN_FAILURE'; payload: string }
  | { type: 'LOGOUT' }
  | { type: 'REGISTER_START' }
  | { type: 'REGISTER_SUCCESS'; payload: User }
  | { type: 'REGISTER_FAILURE'; payload: string }
  | { type: 'CLEAR_ERROR' }
  | { type: 'SET_LOADING'; payload: boolean };

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: true,   // true on mount — resolves after checkAuth
  error: null,
};

const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'LOGIN_START':
    case 'REGISTER_START':
      return { ...state, isLoading: true, error: null };
    case 'LOGIN_SUCCESS':
    case 'REGISTER_SUCCESS':
      if (typeof window !== 'undefined') {
        localStorage.setItem('user', JSON.stringify(action.payload));
      }
      return {
        ...state,
        user: action.payload,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      };
    case 'LOGIN_FAILURE':
    case 'REGISTER_FAILURE':
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: action.payload,
      };
    case 'LOGOUT':
      if (typeof window !== 'undefined') {
        localStorage.removeItem('user');
      }
      return {
        ...state,
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      };
    case 'CLEAR_ERROR':
      return { ...state, error: null };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    default:
      return state;
  }
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  useEffect(() => {
    const checkAuth = async () => {
      dispatch({ type: 'SET_LOADING', payload: true });
      try {
        const response = await apiService.getProfile();
        dispatch({ type: 'LOGIN_SUCCESS', payload: response.data });
      } catch {
        apiService.logout();
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };
    checkAuth();
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    dispatch({ type: 'LOGIN_START' });
    try {
      const response = await apiService.login({ username, password });
      dispatch({ type: 'LOGIN_SUCCESS', payload: response.user });
      return response.user;
    } catch (error: any) {
      const data = error.response?.data;
      const errorMessage =
        typeof data === 'string' ? data
        : data?.detail
        || data?.non_field_errors?.[0]
        || (Array.isArray(data) ? data[0] : null)
        || 'Invalid username or password.';
      dispatch({ type: 'LOGIN_FAILURE', payload: errorMessage });
      throw error;
    }
  }, []);

  const staffLogin = useCallback(async (username: string, password: string) => {
    dispatch({ type: 'LOGIN_START' });
    try {
      const response = await apiService.staffLogin({ username, password });
      dispatch({ type: 'LOGIN_SUCCESS', payload: response.user });
      return response.user;
    } catch (error: any) {
      const data = error.response?.data;
      const errorMessage =
        typeof data === 'string' ? data
        : data?.detail
        || data?.non_field_errors?.[0]
        || (Array.isArray(data) ? data[0] : null)
        || 'Invalid credentials.';
      dispatch({ type: 'LOGIN_FAILURE', payload: errorMessage });
      throw error;
    }
  }, []);

  const register = useCallback(async (userData: {
    username: string;
    password: string;
    confirm_password: string;
    user_type: 'buyer' | 'seller' | 'manager';
    email?: string;
    public_key?: string;
    encrypted_private_key?: string;
  }) => {
    dispatch({ type: 'REGISTER_START' });
    try {
      if (!userData.public_key) {
        const keys = EncryptionService.generateKeyPair();
        userData.public_key = keys.publicKey;
        userData.encrypted_private_key = keys.privateKey;
      }
      const response = await apiService.register(userData);
      // response is already response.data from apiService.register
      dispatch({ type: 'REGISTER_SUCCESS', payload: response.user });
      return response;   // ← return so pages can read requires_otp
    } catch (error: any) {
      const data = error.response?.data;
      let errorMessage = 'Registration failed';
      if (typeof data === 'string') errorMessage = data;
      else if (data?.detail)           errorMessage = data.detail;
      else if (data?.username)         errorMessage = `Username: ${data.username[0]}`;
      else if (data?.password)         errorMessage = `Password: ${data.password[0]}`;
      else if (data?.non_field_errors)  errorMessage = data.non_field_errors[0];
      dispatch({ type: 'REGISTER_FAILURE', payload: errorMessage });
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiService.logoutApi();
    } catch (error) {
      // Continue with logout even if API call fails
    } finally {
      dispatch({ type: 'LOGOUT' });
    }
  }, []);

  const generateKeys = useCallback(async () => {
    return EncryptionService.generateKeyPair();
  }, []);

  const generateUsername = useCallback(async () => {
    try {
      const response = await apiService.generateUsername();
      return response.data.username;
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Failed to generate username');
    }
  }, []);

  const clearError = useCallback(() => {
    dispatch({ type: 'CLEAR_ERROR' });
  }, []);

  const value: AuthContextType = useMemo(() => ({
    ...state,
    login,
    staffLogin,
    register,
    logout,
    generateKeys,
    generateUsername,
    clearError,
  }), [state, login, staffLogin, register, logout, generateKeys, generateUsername, clearError]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
