import { createAuthClient } from 'better-auth/react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const authClient: any = createAuthClient({
  baseURL:
    typeof window === 'undefined'
      ? (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001')
      : window.location.origin,
  basePath: '/auth',
});

export const signIn = authClient.signIn;
export const signUp = authClient.signUp;
export const signOut = authClient.signOut;
export const useSession = authClient.useSession;
