'use client';

import { useEffect, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import ChannelCard from '@/components/ChannelCard';
import AddChannelModal from '@/components/AddChannelModal';
import PlanCreator from '@/components/PlanCreator';
import Link from 'next/link';
import { useTheme } from '@/components/ThemeProvider';
import { useAvatar } from '@/components/AvatarProvider';

interface Channel {
  id: number;
  name: string;
  channel_id: string;
  thumbnail: string;
  description: string;
}

interface Plan {
  id: number;
  title: string;
  topics: string;
  hours_per_day: number;
  total_days: number;
  created_at: string;
}

/* ─── Landing page (não logado) ─── */
function LandingPage() {
  const features = [
    { icon: '🎬', title: 'Importe canais do YouTube', desc: 'Adicione qualquer canal ou playlist e nós extraímos todos os vídeos automaticamente.' },
    { icon: '✨', title: 'Plano gerado por IA', desc: 'A IA organiza os vídeos em um plano dia a dia com ordem de dificuldade e temas.' },
    { icon: '📊', title: 'Acompanhe o progresso', desc: 'Marque vídeos como assistidos, escreva anotações e veja seu avanço em tempo real.' },
    { icon: '🗺️', title: 'Mapas mentais', desc: 'Gere mapas mentais do dia ou do plano inteiro com um clique e faça download.' },
  ];

  const steps = [
    { n: '1', title: 'Crie sua conta', desc: 'Cadastro rápido com email ou Google.' },
    { n: '2', title: 'Adicione um canal', desc: 'Cole a URL de qualquer canal ou playlist do YouTube.' },
    { n: '3', title: 'Gere o plano', desc: 'A IA cria um plano personalizado com base nos seus tópicos e horas disponíveis.' },
    { n: '4', title: 'Estude e progrida', desc: 'Siga o plano, anote insights e acompanhe seu crescimento.' },
  ];

  return (
    <main className="min-h-screen bg-zinc-950 text-white overflow-x-hidden">
      {/* Blobs de fundo */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-60 left-1/2 -translate-x-1/2 w-[900px] h-[700px] bg-violet-600/8 rounded-full blur-3xl animate-glow-pulse" />
        <div className="absolute bottom-0 right-0 w-[600px] h-[400px] bg-cyan-600/5 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -left-40 w-[400px] h-[400px] bg-violet-800/5 rounded-full blur-3xl" />
      </div>

      {/* Nav */}
      <nav className="sticky top-0 z-40 border-b border-white/[0.05] bg-zinc-950/80 backdrop-blur-xl px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center shadow-[0_0_20px_rgba(139,92,246,0.4)]">
              <span className="text-sm">📚</span>
            </div>
            <span className="font-bold text-white">StudyPlanner</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="px-4 py-2 text-zinc-400 hover:text-white text-sm transition-colors">
              Entrar
            </Link>
            <Link href="/register" className="px-4 py-2 bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400 text-white text-sm rounded-xl font-semibold transition-all shadow-[0_0_20px_rgba(139,92,246,0.3)] hover:shadow-[0_0_35px_rgba(139,92,246,0.5)]">
              Criar conta grátis
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative max-w-5xl mx-auto px-6 pt-24 pb-20 text-center animate-slide-up">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-violet-500/10 border border-violet-500/25 rounded-full text-violet-400 text-xs font-medium mb-6">
          <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-pulse" />
          YouTube + IA para seus estudos
        </div>
        <h1 className="text-5xl md:text-6xl font-bold leading-tight mb-6">
          <span className="bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
            Estude com foco
          </span>
          <br />
          <span className="bg-gradient-to-r from-violet-400 via-violet-300 to-cyan-400 bg-clip-text text-transparent">
            guiado pela IA
          </span>
        </h1>
        <p className="text-zinc-400 text-lg max-w-xl mx-auto mb-10 leading-relaxed">
          Transforme qualquer canal do YouTube em um plano de estudo organizado, dia a dia, com trilha de progresso e mapas mentais.
        </p>
        <div className="flex items-center justify-center gap-4 flex-wrap">
          <Link href="/register" className="px-7 py-3.5 bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400 text-white rounded-2xl font-semibold text-sm transition-all shadow-[0_0_30px_rgba(139,92,246,0.4)] hover:shadow-[0_0_50px_rgba(139,92,246,0.6)] hover:-translate-y-0.5">
            Começar grátis →
          </Link>
          <Link href="/login" className="px-7 py-3.5 bg-white/[0.05] hover:bg-white/[0.09] border border-white/[0.08] text-zinc-300 rounded-2xl text-sm transition-all">
            Já tenho conta
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="relative max-w-5xl mx-auto px-6 py-16">
        <h2 className="text-center text-zinc-500 text-xs uppercase tracking-[0.2em] font-semibold mb-10">O que você vai ter</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {features.map((f, i) => (
            <div key={i} className="bg-zinc-900/50 backdrop-blur-sm border border-zinc-700/40 hover:border-violet-500/30 rounded-2xl p-6 transition-all duration-300 hover:bg-zinc-900/70 hover:shadow-[0_0_30px_rgba(139,92,246,0.06)] group">
              <div className="text-3xl mb-3">{f.icon}</div>
              <h3 className="text-white font-semibold mb-1.5 group-hover:text-violet-300 transition-colors">{f.title}</h3>
              <p className="text-zinc-500 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Como funciona */}
      <section className="relative max-w-5xl mx-auto px-6 py-16">
        <h2 className="text-center text-zinc-500 text-xs uppercase tracking-[0.2em] font-semibold mb-10">Como funciona</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {steps.map((s, i) => (
            <div key={i} className="relative text-center">
              {i < steps.length - 1 && (
                <div className="hidden md:block absolute top-6 left-full w-full h-px bg-gradient-to-r from-violet-500/30 to-transparent -z-10" />
              )}
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-600/20 to-violet-800/20 border border-violet-500/20 flex items-center justify-center text-violet-400 font-bold text-lg mx-auto mb-3">
                {s.n}
              </div>
              <h3 className="text-white font-semibold text-sm mb-1">{s.title}</h3>
              <p className="text-zinc-500 text-xs leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA final */}
      <section className="relative max-w-xl mx-auto px-6 py-20 text-center">
        <div className="bg-zinc-900/60 backdrop-blur-sm border border-zinc-700/40 rounded-3xl p-10">
          <div className="text-4xl mb-4 animate-float inline-block">🚀</div>
          <h2 className="text-2xl font-bold text-white mb-3">Pronto para começar?</h2>
          <p className="text-zinc-500 text-sm mb-6">Gratuito, sem cartão de crédito.</p>
          <Link href="/register" className="inline-block px-8 py-3.5 bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400 text-white rounded-2xl font-semibold text-sm transition-all shadow-[0_0_30px_rgba(139,92,246,0.4)] hover:shadow-[0_0_50px_rgba(139,92,246,0.6)]">
            Criar conta grátis
          </Link>
        </div>
      </section>

      <footer className="text-center pb-10 text-zinc-700 text-xs">
        © {new Date().getFullYear()} StudyPlanner — feito com ☕ e IA
      </footer>
    </main>
  );
}

/* ─── Dashboard (logado) ─── */
export default function Home() {
  const { data: session, status } = useSession();
  const { theme, toggle } = useTheme();
  const { avatarUrl, setAvatarUrl } = useAvatar();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPlanCreator, setShowPlanCreator] = useState(false);
  const [deletingPlan, setDeletingPlan] = useState<number | null>(null);
  const [resetting, setResetting] = useState(false);

  async function loadChannels() {
    const res = await fetch('/api/channels');
    setChannels(await res.json());
  }

  async function loadPlans() {
    const res = await fetch('/api/plano');
    setPlans(await res.json());
  }

  useEffect(() => {
    if (status === 'authenticated') {
      loadChannels();
      loadPlans();
      // Carrega avatar salvo no banco (pode ser diferente da foto do Google)
      fetch('/api/profile')
        .then(r => r.json())
        .then(d => {
          const url = d.user?.avatar_url || d.googleImage || '';
          if (url) setAvatarUrl(url);
        })
        .catch(() => {});
    }
  }, [status]);

  async function handleDeleteChannel(id: number) {
    await fetch(`/api/channels?id=${id}`, { method: 'DELETE' });
    loadChannels();
  }

  async function handleResetAll() {
    if (!confirm('Apagar TODOS os planos e histórico de vídeos usados? Os canais serão mantidos.')) return;
    setResetting(true);
    await fetch('/api/reset', { method: 'DELETE' });
    await loadPlans();
    setResetting(false);
  }

  async function handleDeletePlan(id: number) {
    setDeletingPlan(id);
    await fetch(`/api/plano?id=${id}`, { method: 'DELETE' });
    await loadPlans();
    setDeletingPlan(null);
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <span className="w-8 h-8 border-2 border-zinc-700 border-t-violet-400 rounded-full animate-spin" />
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return <LandingPage />;
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white relative overflow-x-hidden">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-60 -right-40 w-[600px] h-[600px] bg-violet-600/8 rounded-full blur-3xl animate-glow-pulse" />
        <div className="absolute top-1/2 -left-60 w-[500px] h-[500px] bg-cyan-600/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 right-1/3 w-[400px] h-[300px] bg-violet-800/6 rounded-full blur-3xl" />
      </div>

      <header className="sticky top-0 z-40 border-b border-white/[0.05] bg-zinc-950/80 backdrop-blur-xl px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center shadow-[0_0_20px_rgba(139,92,246,0.4)]">
              <span className="text-sm">📚</span>
            </div>
            <div>
              <h1 className="text-base font-bold bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent leading-none">
                StudyPlanner
              </h1>
              <p className="text-[10px] text-zinc-600 mt-0.5">YouTube + IA para seus estudos</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link href="/progresso" className="px-3 py-2 text-zinc-500 hover:text-zinc-300 text-sm rounded-lg hover:bg-white/[0.05] transition-all flex items-center gap-1.5 group border border-transparent hover:border-white/[0.08]">
              <svg className="w-4 h-4 group-hover:text-violet-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              Progresso
            </Link>

            {channels.length > 0 && (
              <button
                onClick={() => setShowPlanCreator(true)}
                className="px-4 py-2 bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400 text-white text-sm rounded-lg font-medium transition-all duration-300 shadow-[0_0_20px_rgba(139,92,246,0.35)] hover:shadow-[0_0_35px_rgba(139,92,246,0.6)] flex items-center gap-2"
              >
                ✨ Criar Plano
              </button>
            )}

            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-white/[0.05] hover:bg-white/[0.09] border border-white/[0.08] hover:border-white/[0.15] text-zinc-300 text-sm rounded-lg transition-all flex items-center gap-2"
            >
              <span className="text-violet-400 font-bold">+</span> Canal
            </button>

            {plans.length > 0 && (
              <button
                onClick={handleResetAll}
                disabled={resetting}
                className="px-3 py-2 text-zinc-700 hover:text-red-400 hover:bg-red-950/20 rounded-lg transition-colors text-sm disabled:opacity-50"
                title="Apagar todos os planos"
              >
                {resetting ? '...' : '🗑'}
              </button>
            )}

            {/* Tema toggle */}
            <button
              onClick={toggle}
              className="w-8 h-8 flex items-center justify-center text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.05] rounded-lg transition-all"
              title={theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
            >
              {theme === 'dark' ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
            </button>

            {/* Avatar + links */}
            {session?.user && (
              <div className="flex items-center gap-2 pl-2 border-l border-zinc-800">
                <Link href="/profile" className="flex items-center gap-1.5 hover:opacity-80 transition-opacity">
                  {(avatarUrl || session.user.image) ? (
                    <img src={avatarUrl || session.user.image!} alt="" className="w-7 h-7 rounded-full border border-zinc-700 object-cover" />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-violet-600 flex items-center justify-center text-xs font-bold text-white">
                      {session.user.name?.[0]?.toUpperCase() ?? '?'}
                    </div>
                  )}
                </Link>
                <button
                  onClick={() => signOut({ callbackUrl: '/login' })}
                  className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
                  title="Sair"
                >
                  Sair
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8 flex flex-col gap-12 relative">
        <section className="animate-slide-up">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-1 h-5 bg-gradient-to-b from-violet-400 to-violet-700 rounded-full" />
            <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-[0.12em]">Meus Canais</h2>
            {channels.length > 0 && (
              <span className="text-xs bg-violet-500/15 text-violet-400 border border-violet-500/25 px-2 py-0.5 rounded-full font-medium">
                {channels.length}
              </span>
            )}
          </div>

          {channels.length === 0 ? (
            <div
              className="border-2 border-dashed border-zinc-800 hover:border-violet-500/50 rounded-2xl p-14 text-center cursor-pointer transition-all duration-500 hover:bg-violet-500/[0.03] group"
              onClick={() => setShowAddModal(true)}
            >
              <div className="text-5xl mb-4 inline-block animate-float">📺</div>
              <p className="text-zinc-400 text-sm font-medium group-hover:text-violet-400 transition-colors">
                Nenhum canal adicionado ainda
              </p>
              <p className="text-zinc-600 text-xs mt-2">
                Adicione canais do YouTube para começar
              </p>
              <div className="mt-5 inline-flex items-center gap-2 px-4 py-2 bg-violet-500/10 border border-violet-500/30 rounded-full text-violet-400 text-xs font-medium group-hover:bg-violet-500/20 transition-all">
                + Adicionar primeiro canal
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap gap-5 items-start">
              {channels.map((ch) => (
                <ChannelCard key={ch.id} channel={ch} onDelete={handleDeleteChannel} />
              ))}
              <div className="flex flex-col items-center gap-2 cursor-pointer group" onClick={() => setShowAddModal(true)}>
                <div className="w-20 h-20 rounded-full border-2 border-dashed border-zinc-700/70 hover:border-violet-500/60 flex items-center justify-center text-zinc-600 hover:text-violet-400 text-2xl transition-all duration-300 hover:bg-violet-500/10 hover:shadow-[0_0_25px_rgba(139,92,246,0.25)]">
                  +
                </div>
                <span className="text-xs text-zinc-600 group-hover:text-violet-400 transition-colors">Adicionar</span>
              </div>
            </div>
          )}
        </section>

        {plans.length > 0 && (
          <section className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-1 h-5 bg-gradient-to-b from-cyan-400 to-cyan-700 rounded-full" />
              <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-[0.12em]">Planos de Estudo</h2>
              <span className="text-xs bg-cyan-500/15 text-cyan-400 border border-cyan-500/25 px-2 py-0.5 rounded-full font-medium">
                {plans.length}
              </span>
            </div>

            <div className="flex flex-col gap-3">
              {plans.map((plan, i) => {
                const topics: string[] = JSON.parse(plan.topics);
                return (
                  <div
                    key={plan.id}
                    className="flex items-center gap-3 bg-zinc-900/50 backdrop-blur-sm border border-zinc-700/40 hover:border-violet-500/40 rounded-2xl px-5 py-4 transition-all duration-300 group hover:bg-zinc-900/70 hover:shadow-[0_0_30px_rgba(139,92,246,0.07)] animate-slide-up"
                    style={{ animationDelay: `${0.05 * i}s` }}
                  >
                    <Link href={`/plano?id=${plan.id}`} className="flex-1 flex items-center justify-between min-w-0">
                      <div className="min-w-0">
                        <p className="text-zinc-100 font-medium text-sm group-hover:text-violet-400 transition-colors truncate">
                          {plan.title}
                        </p>
                        <div className="flex gap-1.5 mt-1.5 flex-wrap">
                          {topics.map((t) => (
                            <span key={t} className="text-xs bg-zinc-800/80 text-zinc-500 px-2 py-0.5 rounded-full border border-zinc-700/40">
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 ml-4">
                        <p className="text-sm text-violet-400 font-semibold">{plan.total_days} dias</p>
                        <p className="text-xs text-zinc-600">{plan.hours_per_day}h/dia</p>
                      </div>
                    </Link>

                    <button
                      onClick={() => handleDeletePlan(plan.id)}
                      disabled={deletingPlan === plan.id}
                      className="flex-shrink-0 w-8 h-8 flex items-center justify-center text-zinc-700 hover:text-red-400 hover:bg-red-950/30 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {deletingPlan === plan.id ? (
                        <span className="w-3 h-3 border-2 border-zinc-600 border-t-red-400 rounded-full animate-spin" />
                      ) : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {channels.length > 0 && plans.length === 0 && (
          <section className="text-center py-10 animate-fade-in">
            <div className="text-4xl mb-3 inline-block animate-float">✨</div>
            <p className="text-zinc-500 text-sm">Canais adicionados! Agora crie seu plano.</p>
            <button onClick={() => setShowPlanCreator(true)} className="mt-3 text-violet-400 hover:text-violet-300 text-sm hover:underline transition-colors">
              Criar meu primeiro plano →
            </button>
          </section>
        )}
      </div>

      {showAddModal && <AddChannelModal onClose={() => setShowAddModal(false)} onAdded={loadChannels} />}
      {showPlanCreator && <PlanCreator onClose={() => setShowPlanCreator(false)} />}
    </main>
  );
}
