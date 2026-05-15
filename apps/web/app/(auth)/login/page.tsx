'use client';

import { useState, type FormEvent } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { authClient } from '@/lib/auth-client';
import { Button } from '@/components/ui/button';

export default function LoginPage() {
  const t = useTranslations('auth.login');
  const tSignup = useTranslations('auth.signup');
  const tErr = useTranslations('error');
  const router = useRouter();
  const params = useSearchParams();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const next = params.get('next') ?? '/onboarding/clinic';
      if (mode === 'signup') {
        const res = await authClient.signUp.email({ email, password, name });
        if (res.error) throw new Error(res.error.message ?? tErr('serverError'));
        router.push(next);
      } else {
        const res = await authClient.signIn.email({ email, password });
        if (res.error) throw new Error(res.error.message ?? tErr('invalidCredentials'));
        router.push(next);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : tErr('serverError'));
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-6">
      <h1 className="text-2xl font-semibold tracking-tight">
        {mode === 'signup' ? tSignup('title') : t('title')}
      </h1>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        {mode === 'signup' && (
          <label className="flex flex-col gap-1">
            <span className="text-sm text-slate-600">{tSignup('firstNameLabel')}</span>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded border border-slate-300 px-3 py-2"
            />
          </label>
        )}
        <label className="flex flex-col gap-1">
          <span className="text-sm text-slate-600">{t('emailLabel')}</span>
          <input
            required
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded border border-slate-300 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm text-slate-600">{t('passwordLabel')}</span>
          <input
            required
            type="password"
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded border border-slate-300 px-3 py-2"
          />
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" disabled={pending}>
          {pending ? '…' : mode === 'signup' ? tSignup('submit') : t('submit')}
        </Button>
        <button
          type="button"
          onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
          className="text-sm text-slate-600 underline"
        >
          {mode === 'login' ? t('noAccountCta') : tSignup('hasAccountCta')}
        </button>
      </form>
    </main>
  );
}
