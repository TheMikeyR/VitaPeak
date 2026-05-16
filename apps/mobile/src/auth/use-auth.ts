import { useCallback, useEffect, useState } from 'react';
import * as SecureStore from 'expo-secure-store';
import { apiFetch } from '../api/client';

const SESSION_KEY = 'vitapeak.session_token';
const JWT_KEY = 'vitapeak.jwt';
const JWT_EXP_KEY = 'vitapeak.jwt_exp';

export interface AuthState {
  sessionToken: string | null;
  jwt: string | null;
  role: 'therapist' | 'client' | null;
  loading: boolean;
}

interface JwtClaims {
  sub: string;
  email: string;
  realm_access?: { roles?: Array<'therapist' | 'client'> };
  exp: number;
}

export async function persistSession(token: string): Promise<void> {
  await SecureStore.setItemAsync(SESSION_KEY, token);
}

export async function persistJwt(token: string, exp: number): Promise<void> {
  await SecureStore.setItemAsync(JWT_KEY, token);
  await SecureStore.setItemAsync(JWT_EXP_KEY, exp.toString());
}

export async function clearAuth(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(SESSION_KEY),
    SecureStore.deleteItemAsync(JWT_KEY),
    SecureStore.deleteItemAsync(JWT_EXP_KEY),
  ]);
}

function decodeJwt(token: string): JwtClaims | null {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const normalised = payload.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = globalThis.atob
      ? globalThis.atob(normalised)
      : Buffer.from(normalised, 'base64').toString('utf8');
    return JSON.parse(decoded) as JwtClaims;
  } catch {
    return null;
  }
}

export async function refreshJwt(): Promise<string | null> {
  const session = await SecureStore.getItemAsync(SESSION_KEY);
  if (!session) return null;
  try {
    const { token } = await apiFetch<{ token: string }>('/auth/token', {
      jwt: session,
    });
    const claims = decodeJwt(token);
    if (claims) await persistJwt(token, claims.exp);
    return token;
  } catch {
    return null;
  }
}

export function useAuth(): AuthState & {
  signInWithSession: (sessionToken: string) => Promise<void>;
  signOut: () => Promise<void>;
} {
  const [state, setState] = useState<AuthState>({
    sessionToken: null,
    jwt: null,
    role: null,
    loading: true,
  });

  const hydrate = useCallback(async () => {
    const [sessionToken, jwt] = await Promise.all([
      SecureStore.getItemAsync(SESSION_KEY),
      SecureStore.getItemAsync(JWT_KEY),
    ]);
    const claims = jwt ? decodeJwt(jwt) : null;
    const expSec = claims?.exp ?? 0;
    let activeJwt = jwt;
    if (sessionToken && (!jwt || expSec * 1000 < Date.now())) {
      activeJwt = await refreshJwt();
    }
    const activeClaims = activeJwt ? decodeJwt(activeJwt) : null;
    setState({
      sessionToken,
      jwt: activeJwt,
      role: activeClaims?.realm_access?.roles?.[0] ?? null,
      loading: false,
    });
  }, []);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const signInWithSession = useCallback(
    async (token: string) => {
      await persistSession(token);
      await hydrate();
    },
    [hydrate],
  );

  const signOut = useCallback(async () => {
    await clearAuth();
    setState({ sessionToken: null, jwt: null, role: null, loading: false });
  }, []);

  return { ...state, signInWithSession, signOut };
}
