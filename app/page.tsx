'use client';

import { useEffect, useState } from 'react';
import { useSession, signOut } from 'next-auth/react';
import ChannelCard from '@/components/ChannelCard';
import AddChannelModal from '@/components/AddChannelModal';
import PlanCreator from '@/components/PlanCreator';
import Link from 'next/link';

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

export default function Home() {
  const { data: session } = useSession();
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
    loadChannels();
    loadPlans();
  }, []);

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

  return (
    <main className="min-h-screen bg-zinc-950 text-white relative overflow-x-hidden">
      {/* Background gradient blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-60 -right-40 w-[600px] h-[600px] bg-violet-600/8 rounded-full blur-3xl animate-glow-pulse" />
        <div className="absolute top-1/2 -left-60 w-[500px] h-[500px] bg-cyan-600/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 right-1/3 w-[400px] h-[300px] bg-violet-800/6 rounded-full blur-3xl" />
      </div>

      {/* Header */}
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
            <Link
              href="/progresso"
              className="px-3 py-2 text-zinc-500 hover:text-zinc-300 text-sm rounded-lg hover:bg-white/[0.05] transition-all flex items-center gap-1.5 group border border-transparent hover:border-white/[0.08]"
            >
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

            {/* Avatar + Logout */}
            {session?.user && (
              <div className="flex items-center gap-2 pl-2 border-l border-zinc-800">
                {session.user.image && (
                  <img
                    src={session.user.image}
                    alt={session.user.name ?? ''}
                    className="w-7 h-7 rounded-full border border-zinc-700"
                  />
                )}
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

        {/* Seção canais */}
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
                Adicione canais do YouTube para começar a criar planos de estudo
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
              <div
                className="flex flex-col items-center gap-2 cursor-pointer group"
                onClick={() => setShowAddModal(true)}
              >
                <div className="w-20 h-20 rounded-full border-2 border-dashed border-zinc-700/70 hover:border-violet-500/60 flex items-center justify-center text-zinc-600 hover:text-violet-400 text-2xl transition-all duration-300 hover:bg-violet-500/10 hover:shadow-[0_0_25px_rgba(139,92,246,0.25)]">
                  +
                </div>
                <span className="text-xs text-zinc-600 group-hover:text-violet-400 transition-colors">Adicionar</span>
              </div>
            </div>
          )}
        </section>

        {/* Seção planos */}
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
                      title="Apagar plano"
                    >
                      {deletingPlan === plan.id ? (
                        <span className="w-3 h-3 border-2 border-zinc-600 border-t-red-400 rounded-full animate-spin" />
                      ) : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
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
            <p className="text-zinc-500 text-sm">Canais adicionados! Agora crie seu plano de estudos.</p>
            <button
              onClick={() => setShowPlanCreator(true)}
              className="mt-3 text-violet-400 hover:text-violet-300 text-sm hover:underline transition-colors"
            >
              Criar meu primeiro plano →
            </button>
          </section>
        )}
      </div>

      {showAddModal && (
        <AddChannelModal onClose={() => setShowAddModal(false)} onAdded={loadChannels} />
      )}
      {showPlanCreator && (
        <PlanCreator onClose={() => setShowPlanCreator(false)} />
      )}
    </main>
  );
}
