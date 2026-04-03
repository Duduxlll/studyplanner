'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function ResetForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get('email') ?? '';
  const prefillCode = searchParams.get('code') ?? '';

  const [code, setCode] = useState(prefillCode);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault();
    setError('');

    if (password !== confirm) {
      setError('As senhas não coincidem.');
      return;
    }

    setLoading(true);
    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code, password }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? 'Erro ao redefinir senha.');
      return;
    }

    router.push('/login?registered=1');
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white flex items-center justify-center relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-violet-600/10 rounded-full blur-3xl animate-glow-pulse" />
      </div>

      <div className="relative w-full max-w-sm mx-4 animate-slide-up">
        <div className="relative bg-zinc-900/80 backdrop-blur-xl border border-zinc-700/50 rounded-3xl px-8 py-10 shadow-[0_0_100px_rgba(139,92,246,0.15)]">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-px bg-gradient-to-r from-transparent via-violet-500/60 to-transparent" />

          <div className="flex flex-col items-center mb-7">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center text-2xl shadow-[0_0_30px_rgba(139,92,246,0.5)] mb-3">
              🔒
            </div>
            <h1 className="text-xl font-bold text-white">Nova senha</h1>
            <p className="text-zinc-500 text-sm mt-1.5 text-center">
              Crie uma nova senha para <span className="text-zinc-300">{email}</span>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {!prefillCode && (
              <div>
                <label className="block text-xs text-zinc-400 mb-1.5 font-medium">Código de verificação</label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  required
                  className="w-full bg-zinc-800/80 border border-zinc-700 focus:border-violet-500 text-white placeholder-zinc-600 rounded-xl px-4 py-3 text-sm outline-none transition-colors tracking-widest text-center font-bold"
                />
              </div>
            )}

            <div>
              <label className="block text-xs text-zinc-400 mb-1.5 font-medium">Nova senha</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                required
                className="w-full bg-zinc-800/80 border border-zinc-700 hover:border-zinc-600 focus:border-violet-500 text-white placeholder-zinc-600 rounded-xl px-4 py-3 text-sm outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs text-zinc-400 mb-1.5 font-medium">Confirmar nova senha</label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full bg-zinc-800/80 border border-zinc-700 hover:border-zinc-600 focus:border-violet-500 text-white placeholder-zinc-600 rounded-xl px-4 py-3 text-sm outline-none transition-colors"
              />
            </div>

            {error && <p className="text-red-400 text-xs">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400 disabled:opacity-50 text-white rounded-2xl font-semibold text-sm transition-all shadow-[0_0_20px_rgba(139,92,246,0.35)] mt-1"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Salvando...
                </span>
              ) : 'Redefinir senha'}
            </button>
          </form>

          <p className="text-center text-xs text-zinc-600 mt-5">
            <Link href="/login" className="text-violet-400 hover:text-violet-300 transition-colors">
              Voltar ao login
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetForm />
    </Suspense>
  );
}
