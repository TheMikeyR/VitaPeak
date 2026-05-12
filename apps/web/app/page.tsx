import { Button } from '@/components/ui/button';

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-start justify-center gap-6 px-6">
      <h1 className="text-4xl font-semibold tracking-tight text-brand-700">VitaPeak</h1>
      <p className="text-slate-600">
        Scaffold up and running. Therapist dashboards land in later chunks.
      </p>
      <Button>Get started</Button>
    </main>
  );
}
