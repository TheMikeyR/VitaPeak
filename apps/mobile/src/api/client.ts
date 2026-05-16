import { ofetch } from 'ofetch';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';

const API_URL =
  (Constants.expoConfig?.extra as { apiUrl?: string } | undefined)?.apiUrl ??
  process.env.EXPO_PUBLIC_API_URL ??
  'http://localhost:3001';

const SESSION_KEY = 'vitapeak.session_token';
const JWT_KEY = 'vitapeak.jwt';

export interface ApiFetchOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
  jwt?: string | null;
}

export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const { jwt, headers, body, method } = options;
  const send = (token?: string | null): Promise<T> =>
    ofetch<T>(`${API_URL}${path}`, {
      method,
      body: body as Record<string, unknown> | undefined,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(headers ?? {}),
      },
    });
  try {
    return await send(jwt ?? (await SecureStore.getItemAsync(JWT_KEY)));
  } catch (err) {
    const status =
      (err as { status?: number; statusCode?: number }).status ??
      (err as { statusCode?: number }).statusCode;
    if (status !== 401) throw err;
    const session = await SecureStore.getItemAsync(SESSION_KEY);
    if (!session) throw err;
    const refresh = await ofetch<{ token: string }>(`${API_URL}/auth/token`, {
      headers: { Authorization: `Bearer ${session}` },
    });
    await SecureStore.setItemAsync(JWT_KEY, refresh.token);
    return await send(refresh.token);
  }
}

export { API_URL };
