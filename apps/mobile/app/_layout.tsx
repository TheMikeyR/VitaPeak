import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import '../src/i18n';
import { useAuth } from '../src/auth/use-auth';

export default function RootLayout() {
  const router = useRouter();
  const segments = useSegments();
  const { loading, sessionToken, role } = useAuth();

  useEffect(() => {
    if (loading) return;
    const top = segments[0] ?? '';
    const inAuth = top === '(auth)';
    const inTherapist = top === '(therapist)';
    const inClient = top === '(client)';

    if (!sessionToken) {
      if (!inAuth) router.replace('/(auth)/login');
      return;
    }
    if (role === 'therapist' && !inTherapist) {
      router.replace('/(therapist)');
    } else if (role === 'client' && !inClient) {
      router.replace('/(client)');
    } else if (role == null && !inAuth) {
      // Authenticated but no role yet — bounce back to login until clinic signup
      // or invite acceptance completes on web.
      router.replace('/(auth)/login');
    }
  }, [loading, sessionToken, role, segments, router]);

  return <Stack screenOptions={{ headerShown: false }} />;
}
