import axios from 'axios';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

const BACKEND_PORT = 3000;

function resolveBaseURL(): string {
  if (Platform.OS === 'web') {
    return `http://localhost:${BACKEND_PORT}`;
  }

  // Expo Go / dev client exponen el host (IP LAN o localhost) que Metro ya
  // usa para conectarse al dispositivo — el backend corre en la misma
  // máquina, así que sirve el mismo host. Esto reemplaza el 10.0.2.2
  // hardcodeado (que solo funciona en el emulador Android) y funciona igual
  // en celular físico, iOS o el emulador, sin tocar código por entorno.
  const hostUri = Constants.expoConfig?.hostUri;
  const host = hostUri?.split(':')[0];
  if (host) {
    return `http://${host}:${BACKEND_PORT}`;
  }

  // Fallback si no hay hostUri (build standalone sin Metro): ajustar a la
  // URL real del backend en ese caso.
  return `http://10.0.2.2:${BACKEND_PORT}`;
}

export const api = axios.create({
  baseURL: resolveBaseURL(),
});

export function setAuthToken(token: string | null) {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
}

export type Tx = {
  id: string;
  accountId: string;
  categoryId?: string | null;
  bookedAt: string;
  valueCents: number;
  type: 'debit' | 'credit';
  merchant?: string | null;
  description?: string | null;
  anomalyScore?: number | null;
  isRecurring: boolean;
  createdAt: string;
  category?: { id: string; name: string; color?: string | null } | null;
};

export async function fetchTransactions(params?: {
  take?: number; skip?: number; from?: string; to?: string; accountId?: string;
}): Promise<Tx[]> {
  const res = await api.get('/transactions', { params });
  return res.data;
}