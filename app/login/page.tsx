'use client';

import { signIn } from 'next-auth/react';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { type SavedAccount, getSavedAccounts, upsertSavedAccount, removeSavedAccount } from '@/lib/saved-accounts';

function GoogleIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

function AccountAvatar({ account }: { account: SavedAccount }) {
  return (
    <div className="w-10 h-10 rounded-full flex-shrink-0 overflow-hidden bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center text-sm font-bold border border-zinc-700/60">
      {account.avatarUrl ? (
        <img src={account.avatarUrl} alt="" className="w-full h-full object-cover" />
      ) : (
        <span className="text-white">{(account.name || account.email).charAt(0).toUpperCase()}</span>
      )}
    </div>
  );
}

function LoginForm() {
  const [mode, setMode] = useState<'saved' | 'options' | 'email'>('options');
  const [savedAccounts, setSavedAccounts] = useState<SavedAccount[]>([]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingEmail, setLoadingEmail] = useState('');
  const [error, setError] = useState('');
  const searchParams = useSearchParams();
  const registered = searchParams.get('registered');

  useEffect(() => {
    const accounts = getSavedAccounts();
    if (accounts.length > 0) {
      setSavedAccounts(accounts);
      setMode('saved');
    }
  }, []);

  async function handleGoogleLogin() {
    setLoading(true);
    await signIn('google', { callbackUrl: '/' });
  }

  async function handleSavedAccountClick(account: SavedAccount) {
    if (account.provider === 'google') {
      setLoadingEmail(account.email);
      await signIn('google', { callbackUrl: '/' });
    } else {
      setEmail(account.email);
      setMode('email');
    }
  }

  async function handleEmailLogin(e: { preventDefault(): void }) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const res = await signIn('credentials', {
      email,
      password,
      callbackUrl: '/',
      redirect: false,
    });
    setLoading(false);
    if (res?.error) {
      setError('Email ou senha incorretos.');
    } else {
      upsertSavedAccount({
        email,
        name: email.split('@')[0],
        avatarUrl: '',
        provider: 'credentials',
      });
      window.location.href = res?.url ?? '/';
    }
  }

  function handleRemoveAccount(e: React.MouseEvent, email: string) {
    e.stopPropagation();
    removeSavedAccount(email);
    const updated = getSavedAccounts();
    setSavedAccounts(updated);
    if (updated.length === 0) setMode('options');
  }

  const logoSection = (
    <div className="flex flex-col items-center mb-7">
      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center text-2xl shadow-[0_0_40px_rgba(139,92,246,0.5)] mb-3">
        📚
      </div>
      <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
        StudyPlanner
      </h1>
    </div>
  );

  return (
    <main className="min-h-screen bg-zinc-950 text-white relative flex items-center justify-center overflow-hidden">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[700px] bg-violet-600/10 rounded-full blur-3xl animate-glow-pulse" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[400px] bg-cyan-600/6 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm mx-4 animate-slide-up">
        <div className="relative bg-zinc-900/80 backdrop-blur-xl border border-zinc-700/50 rounded-3xl px-8 py-10 shadow-[0_0_100px_rgba(139,92,246,0.15)]">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-px bg-gradient-to-r from-transparent via-violet-500/60 to-transparent" />

          {registered && (
            <div className="mb-5 px-4 py-3 bg-green-500/10 border border-green-500/30 rounded-xl text-green-400 text-sm text-center">
              Conta criada! Agora faça login.
            </div>
          )}

          {/* ── MODO: CONTAS SALVAS ── */}
          {mode === 'saved' && (
            <>
              {logoSection}
              <p className="text-zinc-400 text-sm text-center mb-5">Escolha sua conta</p>

              <div className="space-y-2 mb-5">
                {savedAccounts.map((acc) => (
                  <button
                    key={acc.email}
                    onClick={() => handleSavedAccountClick(acc)}
                    disabled={loadingEmail === acc.email}
                    className="w-full flex items-center gap-3 px-4 py-3 bg-zinc-800/60 hover:bg-zinc-700/60 border border-zinc-700/50 hover:border-violet-500/40 rounded-2xl transition-all duration-200 group relative"
                  >
                    <AccountAvatar account={acc} />

                    <div className="flex-1 text-left min-w-0">
                      <p className="text-sm font-medium text-white truncate leading-tight">
                        {acc.name || acc.email.split('@')[0]}
                      </p>
                      <p className="text-xs text-zinc-500 truncate mt-0.5">{acc.email}</p>
                    </div>

                    {acc.provider === 'google' ? (
                      <GoogleIcon className="w-4 h-4 flex-shrink-0 opacity-50" />
                    ) : (
                      <svg className="w-4 h-4 flex-shrink-0 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    )}

                    {loadingEmail === acc.email && (
                      <span className="w-4 h-4 border-2 border-violet-400/30 border-t-violet-400 rounded-full animate-spin flex-shrink-0 absolute right-12" />
                    )}

                    {/* Remove on hover */}
                    <span
                      role="button"
                      onClick={(e) => handleRemoveAccount(e, acc.email)}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-zinc-700 hover:bg-red-500 border border-zinc-600 items-center justify-center text-[11px] leading-none hidden group-hover:flex transition-colors z-10 cursor-pointer select-none"
                      title="Remover conta"
                    >
                      ×
                    </span>
                  </button>
                ))}
              </div>

              <button
                onClick={() => setMode('options')}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-zinc-500 hover:text-zinc-300 text-sm transition-colors rounded-xl hover:bg-zinc-800/40"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Usar outra conta
              </button>
            </>
          )}

          {/* ── MODO: OPÇÕES ── */}
          {mode === 'options' && (
            <>
              {logoSection}
              <p className="text-zinc-500 text-sm text-center -mt-3 mb-6">Seus estudos, organizados</p>

              <button
                onClick={handleGoogleLogin}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 px-5 py-3.5 bg-white hover:bg-zinc-100 disabled:bg-zinc-200 text-zinc-900 rounded-2xl font-semibold text-sm transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-60 mb-3"
              >
                {loading ? (
                  <span className="w-5 h-5 border-2 border-zinc-400 border-t-zinc-700 rounded-full animate-spin" />
                ) : (
                  <GoogleIcon />
                )}
                Entrar com Google
              </button>

              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-zinc-800" />
                <span className="text-zinc-600 text-xs">ou</span>
                <div className="flex-1 h-px bg-zinc-800" />
              </div>

              <button
                onClick={() => setMode('email')}
                className="w-full flex items-center justify-center gap-2 px-5 py-3.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-zinc-600 text-zinc-200 rounded-2xl font-medium text-sm transition-all duration-200"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                Entrar com email
              </button>

              {savedAccounts.length > 0 && (
                <button
                  onClick={() => setMode('saved')}
                  className="w-full text-xs text-zinc-600 hover:text-zinc-400 mt-3 py-1 transition-colors"
                >
                  ← Contas salvas
                </button>
              )}

              <p className="text-center text-xs text-zinc-600 mt-5">
                Não tem conta?{' '}
                <Link href="/register" className="text-violet-400 hover:text-violet-300 transition-colors">
                  Criar conta
                </Link>
              </p>
            </>
          )}

          {/* ── MODO: EMAIL/SENHA ── */}
          {mode === 'email' && (
            <>
              <button
                onClick={() => { setMode(savedAccounts.length > 0 ? 'saved' : 'options'); setError(''); }}
                className="flex items-center gap-1.5 text-zinc-500 hover:text-zinc-300 text-sm mb-5 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Voltar
              </button>

              <form onSubmit={handleEmailLogin} className="space-y-3">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1.5 font-medium">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    required
                    className="w-full bg-zinc-800/80 border border-zinc-700 hover:border-zinc-600 focus:border-violet-500 text-white placeholder-zinc-600 rounded-xl px-4 py-3 text-sm outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs text-zinc-400 mb-1.5 font-medium">Senha</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full bg-zinc-800/80 border border-zinc-700 hover:border-zinc-600 focus:border-violet-500 text-white placeholder-zinc-600 rounded-xl px-4 py-3 text-sm outline-none transition-colors"
                  />
                </div>

                {error && (
                  <p className="text-red-400 text-xs px-1">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3.5 bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400 disabled:opacity-50 text-white rounded-2xl font-semibold text-sm transition-all duration-200 shadow-[0_0_20px_rgba(139,92,246,0.35)] hover:shadow-[0_0_35px_rgba(139,92,246,0.55)] mt-1"
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Entrando...
                    </span>
                  ) : 'Entrar'}
                </button>

                <div className="flex items-center justify-between pt-1">
                  <Link href="/forgot-password" className="text-xs text-zinc-500 hover:text-violet-400 transition-colors">
                    Esqueci a senha
                  </Link>
                  <Link href="/register" className="text-xs text-violet-400 hover:text-violet-300 transition-colors">
                    Criar conta
                  </Link>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
