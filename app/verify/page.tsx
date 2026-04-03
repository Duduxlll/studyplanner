'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function VerifyForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get('email') ?? '';
  const type = (searchParams.get('type') ?? 'register') as 'register' | 'reset';

  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [resent, setResent] = useState(false);
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  const code = digits.join('');

  useEffect(() => {
    refs.current[0]?.focus();
  }, []);

  function handleDigit(index: number, value: string) {
    if (!/^\d*$/.test(value)) return;
    const newDigits = [...digits];
    newDigits[index] = value.slice(-1);
    setDigits(newDigits);
    if (value && index < 5) refs.current[index + 1]?.focus();
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent) {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      refs.current[index - 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent) {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setDigits(pasted.split(''));
      refs.current[5]?.focus();
    }
  }

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault();
    if (code.length < 6) {
      setError('Digite todos os 6 dígitos.');
      return;
    }
    setError('');
    setLoading(true);

    const res = await fetch('/api/auth/verify-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code, type }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? 'Código inválido.');
      return;
    }

    if (type === 'register') {
      router.push('/login?registered=1');
    } else {
      router.push(`/reset-password?email=${encodeURIComponent(email)}&code=${code}`);
    }
  }

  async function handleResend() {
    setResending(true);
    setError('');
    await fetch('/api/auth/send-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, type }),
    });
    setResending(false);
    setResent(true);
    setTimeout(() => setResent(false), 5000);
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white flex items-center justify-center relative overflow-hidden">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-violet-600/10 rounded-full blur-3xl animate-glow-pulse" />
      </div>

      <div className="relative w-full max-w-sm mx-4 animate-slide-up">
        <div className="relative bg-zinc-900/80 backdrop-blur-xl border border-zinc-700/50 rounded-3xl px-8 py-10 shadow-[0_0_100px_rgba(139,92,246,0.15)]">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-px bg-gradient-to-r from-transparent via-violet-500/60 to-transparent" />

          {/* Ícone */}
          <div className="flex flex-col items-center mb-7">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center text-2xl shadow-[0_0_30px_rgba(139,92,246,0.5)] mb-3">
              ✉️
            </div>
            <h1 className="text-xl font-bold text-white">
              {type === 'register' ? 'Confirme seu email' : 'Código enviado'}
            </h1>
            <p className="text-zinc-500 text-sm mt-1.5 text-center">
              Enviamos um código para{' '}
              <span className="text-zinc-300 font-medium">{email}</span>
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Inputs de dígitos */}
            <div className="flex gap-2 justify-center mb-5" onPaste={handlePaste}>
              {digits.map((d, i) => (
                <input
                  key={i}
                  ref={(el) => { refs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={d}
                  onChange={(e) => handleDigit(i, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(i, e)}
                  className="w-11 h-14 text-center text-xl font-bold bg-zinc-800/80 border border-zinc-700 focus:border-violet-500 focus:shadow-[0_0_15px_rgba(139,92,246,0.3)] text-white rounded-xl outline-none transition-all"
                />
              ))}
            </div>

            {error && (
              <p className="text-red-400 text-xs text-center mb-3">{error}</p>
            )}

            {resent && (
              <p className="text-green-400 text-xs text-center mb-3">Código reenviado!</p>
            )}

            <button
              type="submit"
              disabled={loading || code.length < 6}
              className="w-full py-3.5 bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400 disabled:opacity-40 text-white rounded-2xl font-semibold text-sm transition-all shadow-[0_0_20px_rgba(139,92,246,0.35)]"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Verificando...
                </span>
              ) : 'Confirmar'}
            </button>
          </form>

          <div className="flex items-center justify-between mt-5 text-xs">
            <Link href="/login" className="text-zinc-500 hover:text-zinc-300 transition-colors">
              Voltar ao login
            </Link>
            <button
              onClick={handleResend}
              disabled={resending}
              className="text-violet-400 hover:text-violet-300 transition-colors disabled:opacity-50"
            >
              {resending ? 'Enviando...' : 'Reenviar código'}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function VerifyPage() {
  return (
    <Suspense>
      <VerifyForm />
    </Suspense>
  );
}
