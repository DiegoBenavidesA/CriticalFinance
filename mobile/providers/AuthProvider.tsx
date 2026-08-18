import React, { createContext, useContext, useMemo, useState } from 'react';
import { router } from 'expo-router';
import { AxiosError } from 'axios';
import { api, setAuthToken } from '@/lib/api';

type AuthContextType = {
  token: string | null;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);

  const signIn = async (email: string, password: string) => {
    try {
      const res = await api.post('/auth/login', { email, password });
      const accessToken: string = res.data.access_token;
      setAuthToken(accessToken);
      setToken(accessToken);
      router.replace('/(tabs)'); // al loguear, redirige a tabs
    } catch (e) {
      const status = (e as AxiosError).response?.status;
      throw new Error(status === 401 ? 'Credenciales inválidas' : 'No se pudo conectar al servidor');
    }
  };

  const signOut = () => {
    setAuthToken(null);
    setToken(null);
    router.replace('/(auth)/login');
  };

  const value = useMemo(() => ({ token, signIn, signOut }), [token]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}