'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';

export default function ClinicOnboardingPage() {
  const t = useTranslations('clinic.onboarding');
  const tSignup = useTranslations('auth.signup');
  const tErr = useTranslations('error');
  const router = useRouter();
  const [name, setName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const tokenRes = await fetch('/auth/token', { credentials: 'include' });
      const { token } = (await tokenRes.json()) as { token: string };
      const res = await fetch('/api/clinics/signup', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name, firstName, lastName }),
      });
      if (!res.ok) throw new Error(await res.text());
      router.push('/clients/invite');
    } catch (err) {
      setError(err instanceof Error ? err.message : tErr('serverError'));
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-6">
      <h1 className="text-2xl font-semibold tracking-tight">{t('title')}</h1>
      <p className="text-slate-600">{t('description')}</p>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1">
          <span className="text-sm text-slate-600">{t('nameLabel')}</span>
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded border border-slate-300 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm text-slate-600">{tSignup('firstNameLabel')}</span>
          <input
            required
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="rounded border border-slate-300 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm text-slate-600">{tSignup('lastNameLabel')}</span>
          <input
            required
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="rounded border border-slate-300 px-3 py-2"
          />
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" disabled={pending}>
          {pending ? '…' : t('submit')}
        </Button>
      </form>
    </main>
  );
}
