import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { ReactNode } from 'react';

export default async function AppLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies();
  const session = cookieStore.get('better-auth.session_token');
  if (!session) redirect('/login');
  return <>{children}</>;
}
