'use client';

import { useState, type FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';

interface CreateInviteResponse {
  inviteId: string;
  expiresAt: string;
  inviteUrl?: string;
}

export default function ClientInvitePage() {
  const t = useTranslations('invite.send');
  const tErr = useTranslations('error');
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [result, setResult] = useState<CreateInviteResponse | null>(null);
  const [copied, setCopied] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setResult(null);
    setPending(true);
    try {
      const tokenRes = await fetch('/auth/token', { credentials: 'include' });
      const { token } = (await tokenRes.json()) as { token: string };
      const res = await fetch('/api/invites/create', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          email,
          firstName: firstName || undefined,
          lastName: lastName || undefined,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      setResult((await res.json()) as CreateInviteResponse);
    } catch (err) {
      setError(err instanceof Error ? err.message : tErr('serverError'));
    } finally {
      setPending(false);
    }
  }

  async function copyLink() {
    if (!result?.inviteUrl) return;
    await navigator.clipboard.writeText(result.inviteUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-6 px-6">
      <h1 className="text-2xl font-semibold tracking-tight">{t('title')}</h1>
      <form onSubmit={onSubmit} className="flex flex-col gap-4">
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
          <span className="text-sm text-slate-600">{t('firstNameLabel')}</span>
          <input
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="rounded border border-slate-300 px-3 py-2"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm text-slate-600">{t('lastNameLabel')}</span>
          <input
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
      {result && (
        <div className="flex flex-col gap-3 rounded border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-sm font-medium text-emerald-900">{t('emailSent')}</p>
          {result.inviteUrl && (
            <>
              <p className="break-all text-xs text-emerald-900">{result.inviteUrl}</p>
              <Button type="button" onClick={copyLink}>
                {copied ? t('linkCopied') : t('copyLinkCta')}
              </Button>
            </>
          )}
        </div>
      )}
    </main>
  );
}
