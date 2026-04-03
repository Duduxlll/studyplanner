'use client';

import { signIn } from 'next-auth/react';
import { useState } from 'react';

export default function LoginPage() {
  const [loading, setLoading] = useState(false);

  async function handleGoogleLogin() {
    setLoading(true);
    await signIn('google', { callbackUrl: '/' });
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white relative flex items-center justify-center overflow-hidden">
      {/* Background blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[700px] bg-violet-600/10 rounded-full blur-3xl animate-glow-pulse" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[400px] bg-cyan-600/6 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm mx-4 animate-slide-up">
        {/* Card */}
        <div className="relative bg-zinc-900/80 backdrop-blur-xl border border-zinc-700/50 rounded-3xl px-8 py-10 shadow-[0_0_100px_rgba(139,92,246,0.15)]">
          {/* Linha de brilho topo */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-px bg-gradient-to-r from-transparent via-violet-500/60 to-transparent" />

          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center text-3xl shadow-[0_0_40px_rgba(139,92,246,0.5)] mb-4">
              📚
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
              StudyPlanner
            </h1>
            <p className="text-zinc-500 text-sm mt-1.5 text-center">
              Planos de estudo personalizados com YouTube + IA
            </p>
          </div>

          {/* Features */}
          <div className="space-y-2.5 mb-8">
            {[
              { icon: '🎬', text: 'Importe canais e playlists do YouTube' },
              { icon: '✨', text: 'IA cria seu plano de estudos completo' },
              { icon: '📊', text: 'Acompanhe seu progresso em tempo real' },
            ].map((f) => (
              <div key={f.text} className="flex items-center gap-3 text-sm text-zinc-400">
                <span className="text-base">{f.icon}</span>
                {f.text}
              </div>
            ))}
          </div>

          {/* Botão Google */}
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 px-5 py-3.5 bg-white hover:bg-zinc-100 disabled:bg-zinc-200 text-zinc-900 rounded-2xl font-semibold text-sm transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-60"
          >
            {loading ? (
              <>
                <span className="w-5 h-5 border-2 border-zinc-400 border-t-zinc-700 rounded-full animate-spin" />
                Entrando...
              </>
            ) : (
              <>
                <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Entrar com Google
              </>
            )}
          </button>

          <p className="text-center text-xs text-zinc-600 mt-4">
            Seus dados são privados e vinculados à sua conta Google
          </p>
        </div>
      </div>
    </main>
  );
}
