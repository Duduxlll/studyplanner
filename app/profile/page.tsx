'use client';

import { useEffect, useRef, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { useTheme } from '@/components/ThemeProvider';

interface ProfileData {
  user: {
    id: string; email: string; name: string; bio: string;
    avatar_url: string; banner_url: string; theme: string;
    email_verified: number; created_at: string;
  };
  stats: { total_plans: number; total_watched: number; total_videos: number; total_channels: number };
  googleImage: string | null;
}

type Toast = { msg: string; ok: boolean } | null;

function useToast() {
  const [toast, setToast] = useState<Toast>(null);
  function show(msg: string, ok: boolean) {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  }
  return { toast, show };
}

function resizeImage(file: File, maxPx: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.src = e.target!.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export default function ProfilePage() {
  const { data: session } = useSession();
  const { theme, toggle } = useTheme();
  const { toast, show } = useToast();

  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  // Campos editáveis
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Imagens
  const [avatarPreview, setAvatarPreview] = useState<string>('');
  const [bannerPreview, setBannerPreview] = useState<string>('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const bioRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetch('/api/profile')
      .then(r => r.json())
      .then((d: ProfileData) => {
        setData(d);
        setName(d.user.name ?? '');
        setBio(d.user.bio ?? '');
        setAvatarPreview(d.user.avatar_url || d.googleImage || '');
        setBannerPreview(d.user.banner_url || '');
      })
      .finally(() => setLoading(false));
  }, []);

  async function patchField(fields: Record<string, string>) {
    const res = await fetch('/api/profile', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fields),
    });
    return res;
  }

  async function handleSaveProfile() {
    setSaving(true);
    const res = await patchField({ name, bio });
    setSaving(false);
    if (!res.ok) { const j = await res.json(); show(j.error ?? 'Erro ao salvar.', false); return; }
    setData(prev => prev ? { ...prev, user: { ...prev.user, name, bio } } : prev);
    setEditing(false);
    show('Perfil salvo!', true);
  }

  async function handleImageUpload(
    file: File,
    field: 'avatar_url' | 'banner_url',
    setUploading: (v: boolean) => void,
    setPreview: (v: string) => void,
  ) {
    setUploading(true);
    try {
      const maxPx = field === 'avatar_url' ? 400 : 1200;
      const base64 = await resizeImage(file, maxPx);
      const res = await patchField({ [field]: base64 });
      if (!res.ok) { const j = await res.json(); show(j.error ?? 'Erro ao salvar imagem.', false); return; }
      setPreview(base64);
      setData(prev => prev ? { ...prev, user: { ...prev.user, [field]: base64 } } : prev);
      show(field === 'avatar_url' ? 'Foto atualizada!' : 'Banner atualizado!', true);
    } catch {
      show('Erro ao processar imagem.', false);
    } finally {
      setUploading(false);
    }
  }

  const progress = data && data.stats.total_videos > 0
    ? Math.round((data.stats.total_watched / data.stats.total_videos) * 100)
    : 0;

  const initials = (data?.user?.name ?? session?.user?.name ?? '?')[0]?.toUpperCase();

  const memberSince = data?.user?.created_at
    ? new Date(data.user.created_at).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    : '';

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <span className="w-8 h-8 border-2 border-zinc-700 border-t-violet-400 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white relative overflow-x-hidden">
      {/* Blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-60 -right-40 w-[500px] h-[500px] bg-violet-600/8 rounded-full blur-3xl animate-glow-pulse" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[300px] bg-cyan-600/4 rounded-full blur-3xl" />
      </div>

      {/* Toast */}
      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl text-sm font-medium shadow-xl animate-slide-up flex items-center gap-2
          ${toast.ok
            ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300'
            : 'bg-red-500/20 border border-red-500/40 text-red-300'}`}>
          {toast.ok ? '✓' : '✕'} {toast.msg}
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-white/[0.05] bg-zinc-950/80 backdrop-blur-xl px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-1.5 text-zinc-500 hover:text-zinc-300 text-sm transition-colors group">
            <span className="group-hover:-translate-x-0.5 transition-transform inline-block">←</span>
            Início
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center text-xs">📚</div>
            <span className="font-bold text-sm">StudyPlanner</span>
          </div>
          <div className="flex items-center gap-3">
            {/* Toggle tema */}
            <button
              onClick={toggle}
              className="w-8 h-8 flex items-center justify-center text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.05] rounded-lg transition-all"
              title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
            >
              {theme === 'dark'
                ? <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
              }
            </button>
            <button onClick={() => signOut({ callbackUrl: '/login' })} className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors">
              Sair
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-6 py-8 relative">

        {/* ── Card de perfil ── */}
        <div className="relative bg-zinc-900/70 backdrop-blur-xl border border-zinc-700/40 rounded-3xl overflow-hidden mb-5 animate-slide-up">

          {/* Banner */}
          <div className="relative h-32 group">
            {bannerPreview
              ? <img src={bannerPreview} alt="banner" className="w-full h-full object-cover" />
              : <div className="w-full h-full bg-gradient-to-r from-violet-600/30 via-violet-500/20 to-cyan-600/20" />
            }
            {/* Botão editar banner */}
            <button
              onClick={() => bannerInputRef.current?.click()}
              disabled={uploadingBanner}
              className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/40 transition-all opacity-0 group-hover:opacity-100"
            >
              {uploadingBanner
                ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <span className="text-white text-xs font-medium bg-black/50 px-3 py-1.5 rounded-full flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                    Editar banner
                  </span>
              }
            </button>
            <input
              ref={bannerInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => {
                const f = e.target.files?.[0];
                if (f) handleImageUpload(f, 'banner_url', setUploadingBanner, setBannerPreview);
                e.target.value = '';
              }}
            />
          </div>

          <div className="px-7 pb-7">
            {/* Avatar + botões */}
            <div className="flex items-end justify-between -mt-10 mb-5">
              {/* Avatar */}
              <div className="relative group">
                {avatarPreview
                  ? <img src={avatarPreview} alt="" className="w-20 h-20 rounded-2xl border-4 border-zinc-900 object-cover shadow-[0_0_30px_rgba(139,92,246,0.3)]" />
                  : <div className="w-20 h-20 rounded-2xl border-4 border-zinc-900 bg-gradient-to-br from-violet-600 to-violet-800 flex items-center justify-center text-3xl font-bold text-white shadow-[0_0_30px_rgba(139,92,246,0.3)]">
                      {initials}
                    </div>
                }
                {/* Overlay editar avatar */}
                <button
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="absolute inset-0 rounded-2xl flex items-center justify-center bg-black/0 group-hover:bg-black/50 transition-all opacity-0 group-hover:opacity-100"
                >
                  {uploadingAvatar
                    ? <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                  }
                </button>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={e => {
                    const f = e.target.files?.[0];
                    if (f) handleImageUpload(f, 'avatar_url', setUploadingAvatar, setAvatarPreview);
                    e.target.value = '';
                  }}
                />
                {/* Badge verificado */}
                {data?.user?.email_verified ? (
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center border-2 border-zinc-900" title="Email verificado">
                    <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                  </div>
                ) : null}
              </div>

              {/* Botões editar / salvar */}
              {!editing
                ? <button
                    onClick={() => { setEditing(true); setTimeout(() => bioRef.current?.focus(), 50); }}
                    className="flex items-center gap-2 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 text-sm rounded-xl transition-all"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                    Editar perfil
                  </button>
                : <div className="flex gap-2">
                    <button onClick={() => { setEditing(false); setName(data?.user?.name ?? ''); setBio(data?.user?.bio ?? ''); }} className="px-4 py-2 text-sm text-zinc-500 hover:text-zinc-300 transition-colors">
                      Cancelar
                    </button>
                    <button
                      onClick={handleSaveProfile}
                      disabled={saving}
                      className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400 text-white text-sm rounded-xl transition-all disabled:opacity-50 shadow-[0_0_20px_rgba(139,92,246,0.3)]"
                    >
                      {saving && <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                      Salvar
                    </button>
                  </div>
              }
            </div>

            {/* Dados / form */}
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
                  <label className="text-xs text-zinc-500 font-medium">
                    Bio <span className="text-zinc-700">(máx 200)</span>
                  </label>
                  <textarea
                    ref={bioRef}
                    value={bio}
                    onChange={e => setBio(e.target.value)}
                    maxLength={200}
                    rows={3}
                    className="mt-1 w-full bg-zinc-800/80 border border-zinc-700 focus:border-violet-500 text-white placeholder-zinc-600 rounded-xl px-4 py-2.5 text-sm outline-none transition-colors resize-none"
                    placeholder="Seus objetivos de estudo..."
                  />
                  <p className="text-right text-xs text-zinc-700 mt-0.5">{bio.length}/200</p>
                </div>
              </div>
            ) : (
              <div>
                <h1 className="text-xl font-bold text-white mb-0.5">{data?.user?.name ?? session?.user?.name ?? '—'}</h1>
                <p className="text-zinc-500 text-sm">{data?.user?.email ?? session?.user?.email}</p>
                {memberSince && <p className="text-zinc-700 text-xs mt-0.5">Membro desde {memberSince}</p>}
                <p className="text-zinc-400 text-sm mt-3 leading-relaxed">
                  {data?.user?.bio || <span className="italic text-zinc-700">Sem bio ainda.</span>}
                </p>
              </div>
            )}

            {/* Hint fotos */}
            <p className="text-xs text-zinc-700 mt-4">
              Passe o mouse sobre a <span className="text-zinc-600">foto</span> ou o <span className="text-zinc-600">banner</span> para editar as imagens.
            </p>
          </div>
        </div>

        {/* ── Stats ── */}
        {data && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5 animate-slide-up" style={{ animationDelay: '0.05s' }}>
            {[
              { label: 'Canais',     value: data.stats.total_channels, icon: '📺' },
              { label: 'Planos',     value: data.stats.total_plans,    icon: '📋' },
              { label: 'Assistidos', value: data.stats.total_watched,  icon: '✅' },
              { label: 'Progresso',  value: `${progress}%`,            icon: '📈' },
            ].map((s, i) => (
              <div key={i} className="bg-zinc-900/60 border border-zinc-700/40 rounded-2xl p-4 text-center hover:border-violet-500/30 transition-all">
                <div className="text-2xl mb-1.5">{s.icon}</div>
                <p className="text-xl font-bold text-white">{s.value}</p>
                <p className="text-xs text-zinc-500 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Barra progresso */}
        {data && data.stats.total_videos > 0 && (
          <div className="bg-zinc-900/60 border border-zinc-700/40 rounded-2xl p-5 mb-5 animate-slide-up" style={{ animationDelay: '0.08s' }}>
            <div className="flex justify-between mb-2.5">
              <p className="text-sm font-medium text-zinc-300">Progresso total</p>
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

        {/* ── Aparência ── */}
        <div className="bg-zinc-900/60 border border-zinc-700/40 rounded-2xl p-5 mb-5 animate-slide-up" style={{ animationDelay: '0.1s' }}>
          <p className="text-sm font-medium text-zinc-300 mb-3">Aparência</p>
          <div className="flex gap-3">
            {(['dark', 'light'] as const).map(t => (
              <button
                key={t}
                onClick={() => { if (theme !== t) toggle(); }}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium transition-all border
                  ${theme === t
                    ? 'bg-violet-600/20 border-violet-500/50 text-violet-300'
                    : 'bg-zinc-800/60 border-zinc-700/40 text-zinc-500 hover:border-zinc-600'}`}
              >
                {t === 'dark' ? '🌙 Escuro' : '☀️ Claro'}
                {theme === t && <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />}
              </button>
            ))}
          </div>
        </div>

        {/* ── Links rápidos ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 animate-slide-up" style={{ animationDelay: '0.12s' }}>
          {[
            { href: '/',          icon: '🏠', label: 'Início',    desc: 'Canais e planos' },
            { href: '/progresso', icon: '📊', label: 'Progresso', desc: 'Estatísticas' },
          ].map(l => (
            <Link key={l.href} href={l.href} className="flex items-center gap-3 bg-zinc-900/60 border border-zinc-700/40 hover:border-violet-500/30 rounded-2xl p-4 transition-all group">
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
