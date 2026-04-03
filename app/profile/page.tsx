'use client';

import { useEffect, useState, useRef } from 'react';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';

interface ProfileData {
  user: {
    id: string; email: string; name: string; bio: string;
    avatar_url: string; email_verified: number; created_at: string;
  };
  stats: {
    total_plans: number; total_watched: number; total_videos: number; total_channels: number;
  };
  googleImage: string | null;
}

export default function ProfilePage() {
  const { data: session } = useSession();
  const [data, setData] = useState<ProfileData | null>(null);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');
  const bioRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetch('/api/profile').then(r => r.json()).then((d: ProfileData) => {
      setData(d);
      setName(d.user.name ?? '');
      setBio(d.user.bio ?? '');
    });
  }, []);

  async function handleSave() {
    setError('');
    setSaving(true);
    const res = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, bio }),
    });
    const json = await res.json();
    setSaving(false);
    if (!res.ok) { setError(json.error); return; }
    setData(prev => prev ? { ...prev, user: { ...prev.user, name, bio } } : prev);
    setEditing(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  const progress = data
    ? data.stats.total_videos > 0
      ? Math.round((data.stats.total_watched / data.stats.total_videos) * 100)
      : 0
    : 0;

  const avatar = data?.googleImage || session?.user?.image;
  const initials = (data?.user?.name ?? session?.user?.name ?? '?')[0]?.toUpperCase();

  const memberSince = data?.user?.created_at
    ? new Date(data.user.created_at).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    : '';

  return (
    <main className="min-h-screen bg-zinc-950 text-white relative overflow-x-hidden">
      {/* Blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-60 -right-40 w-[500px] h-[500px] bg-violet-600/8 rounded-full blur-3xl animate-glow-pulse" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[300px] bg-cyan-600/4 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-white/[0.05] bg-zinc-950/80 backdrop-blur-xl px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-1.5 text-zinc-500 hover:text-zinc-300 text-sm transition-colors group">
            <span className="group-hover:-translate-x-0.5 transition-transform inline-block">←</span>
            Início
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center shadow-[0_0_20px_rgba(139,92,246,0.4)]">
              <span className="text-sm">📚</span>
            </div>
            <span className="font-bold text-sm bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
              StudyPlanner
            </span>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
          >
            Sair
          </button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-6 py-10 relative">

        {/* Card de perfil */}
        <div className="relative bg-zinc-900/70 backdrop-blur-xl border border-zinc-700/40 rounded-3xl overflow-hidden mb-6 animate-slide-up">
          {/* Faixa superior gradient */}
          <div className="h-24 bg-gradient-to-r from-violet-600/30 via-violet-500/20 to-cyan-600/20" />

          <div className="px-8 pb-8">
            {/* Avatar */}
            <div className="flex items-end justify-between -mt-12 mb-5">
              <div className="relative">
                {avatar ? (
                  <img
                    src={avatar}
                    alt=""
                    className="w-20 h-20 rounded-2xl border-4 border-zinc-900 shadow-[0_0_30px_rgba(139,92,246,0.3)] object-cover"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-2xl border-4 border-zinc-900 bg-gradient-to-br from-violet-600 to-violet-800 flex items-center justify-center text-3xl font-bold text-white shadow-[0_0_30px_rgba(139,92,246,0.3)]">
                    {initials}
                  </div>
                )}
                {/* Badge verificado */}
                {data?.user?.email_verified ? (
                  <div className="absolute -bottom-1.5 -right-1.5 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center border-2 border-zinc-900" title="Email verificado">
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                ) : null}
              </div>

              {!editing ? (
                <button
                  onClick={() => { setEditing(true); setTimeout(() => bioRef.current?.focus(), 50); }}
                  className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-zinc-600 text-zinc-300 text-sm rounded-xl transition-all"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Editar perfil
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={() => { setEditing(false); setName(data?.user?.name ?? ''); setBio(data?.user?.bio ?? ''); setError(''); }}
                    className="px-4 py-2 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400 text-white text-sm rounded-xl transition-all disabled:opacity-50 shadow-[0_0_20px_rgba(139,92,246,0.3)]"
                  >
                    {saving ? <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : null}
                    Salvar
                  </button>
                </div>
              )}
            </div>

            {/* Nome + bio */}
            {editing ? (
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-zinc-500 font-medium">Nome</label>
                  <input
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="mt-1 w-full bg-zinc-800/80 border border-zinc-700 focus:border-violet-500 text-white placeholder-zinc-600 rounded-xl px-4 py-2.5 text-sm outline-none transition-colors"
                    placeholder="Seu nome"
                  />
                </div>
                <div>
                  <label className="text-xs text-zinc-500 font-medium">Bio <span className="text-zinc-700">(máx 200 chars)</span></label>
                  <textarea
                    ref={bioRef}
                    value={bio}
                    onChange={e => setBio(e.target.value)}
                    maxLength={200}
                    rows={3}
                    className="mt-1 w-full bg-zinc-800/80 border border-zinc-700 focus:border-violet-500 text-white placeholder-zinc-600 rounded-xl px-4 py-2.5 text-sm outline-none transition-colors resize-none"
                    placeholder="Fale um pouco sobre você e seus objetivos de estudo..."
                  />
                  <p className="text-right text-xs text-zinc-700 mt-1">{bio.length}/200</p>
                </div>
                {error && <p className="text-red-400 text-xs">{error}</p>}
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="text-xl font-bold text-white">
                    {data?.user?.name ?? session?.user?.name ?? '—'}
                  </h1>
                  {saved && (
                    <span className="text-xs text-emerald-400 flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      Salvo!
                    </span>
                  )}
                </div>
                <p className="text-zinc-500 text-sm mb-1">{data?.user?.email ?? session?.user?.email}</p>
                {memberSince && (
                  <p className="text-zinc-700 text-xs mb-3">Membro desde {memberSince}</p>
                )}
                {data?.user?.bio ? (
                  <p className="text-zinc-400 text-sm leading-relaxed">{data.user.bio}</p>
                ) : (
                  <p className="text-zinc-700 text-sm italic">Sem bio ainda. Clique em "Editar perfil" para adicionar.</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Stats */}
        {data && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 animate-slide-up" style={{ animationDelay: '0.05s' }}>
            {[
              { label: 'Canais', value: data.stats.total_channels, icon: '📺', color: 'violet' },
              { label: 'Planos', value: data.stats.total_plans, icon: '📋', color: 'cyan' },
              { label: 'Assistidos', value: data.stats.total_watched, icon: '✅', color: 'emerald' },
              { label: 'Progresso', value: `${progress}%`, icon: '📈', color: 'amber' },
            ].map((s, i) => (
              <div key={i} className="bg-zinc-900/60 border border-zinc-700/40 rounded-2xl p-4 text-center hover:border-violet-500/30 transition-all">
                <div className="text-2xl mb-2">{s.icon}</div>
                <p className="text-xl font-bold text-white">{s.value}</p>
                <p className="text-xs text-zinc-500 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Barra de progresso geral */}
        {data && data.stats.total_videos > 0 && (
          <div className="bg-zinc-900/60 border border-zinc-700/40 rounded-2xl p-5 mb-6 animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-zinc-300">Progresso total nos planos</p>
              <p className="text-sm font-bold text-violet-400">{data.stats.total_watched}/{data.stats.total_videos} vídeos</p>
            </div>
            <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-violet-600 via-violet-400 to-cyan-400 rounded-full relative overflow-hidden transition-all duration-700"
                style={{ width: `${progress}%` }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
              </div>
            </div>
          </div>
        )}

        {/* Links rápidos */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 animate-slide-up" style={{ animationDelay: '0.15s' }}>
          {[
            { href: '/', icon: '🏠', label: 'Início', desc: 'Canais e planos' },
            { href: '/progresso', icon: '📊', label: 'Progresso', desc: 'Estatísticas detalhadas' },
          ].map((l) => (
            <Link key={l.href} href={l.href} className="flex items-center gap-3 bg-zinc-900/60 border border-zinc-700/40 hover:border-violet-500/30 rounded-2xl p-4 transition-all hover:bg-zinc-900/80 group">
              <span className="text-xl">{l.icon}</span>
              <div>
                <p className="text-sm font-medium text-zinc-200 group-hover:text-violet-400 transition-colors">{l.label}</p>
                <p className="text-xs text-zinc-600">{l.desc}</p>
              </div>
            </Link>
          ))}
          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="flex items-center gap-3 bg-zinc-900/60 border border-zinc-700/40 hover:border-red-500/30 rounded-2xl p-4 transition-all hover:bg-red-950/20 group text-left"
          >
            <span className="text-xl">🚪</span>
            <div>
              <p className="text-sm font-medium text-zinc-200 group-hover:text-red-400 transition-colors">Sair</p>
              <p className="text-xs text-zinc-600">Encerrar sessão</p>
            </div>
          </button>
        </div>
      </div>
    </main>
  );
}
