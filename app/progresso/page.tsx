'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface StatsData {
  totals: {
    total_videos: number;
    total_minutes: number;
    watched_videos: number;
    watched_minutes: number;
  };
  plansCount: number;
  planProgress: {
    id: number;
    title: string;
    topics: string;
    total_days: number;
    hours_per_day: number;
    created_at: string;
    total_videos: number;
    total_minutes: number;
    watched_videos: number;
    watched_minutes: number;
  }[];
  byLevel: { level: string; total: number; watched: number }[];
}

function formatMinutes(minutes: number): string {
  if (!minutes) return '0min';
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m}min`;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

const STAT_CONFIGS: Record<string, { gradient: string; border: string; hoverBorder: string; text: string; glow: string; icon: string }> = {
  violet: {
    gradient: 'from-violet-600/15 via-violet-900/5 to-transparent',
    border: 'border-violet-500/20',
    hoverBorder: 'hover:border-violet-500/50',
    text: 'text-violet-400',
    glow: 'hover:shadow-[0_0_40px_rgba(139,92,246,0.2)]',
    icon: 'bg-violet-500/15 text-violet-400',
  },
  emerald: {
    gradient: 'from-emerald-600/15 via-emerald-900/5 to-transparent',
    border: 'border-emerald-500/20',
    hoverBorder: 'hover:border-emerald-500/50',
    text: 'text-emerald-400',
    glow: 'hover:shadow-[0_0_40px_rgba(16,185,129,0.2)]',
    icon: 'bg-emerald-500/15 text-emerald-400',
  },
  blue: {
    gradient: 'from-blue-600/15 via-blue-900/5 to-transparent',
    border: 'border-blue-500/20',
    hoverBorder: 'hover:border-blue-500/50',
    text: 'text-blue-400',
    glow: 'hover:shadow-[0_0_40px_rgba(59,130,246,0.2)]',
    icon: 'bg-blue-500/15 text-blue-400',
  },
  amber: {
    gradient: 'from-amber-600/15 via-amber-900/5 to-transparent',
    border: 'border-amber-500/20',
    hoverBorder: 'hover:border-amber-500/50',
    text: 'text-amber-400',
    glow: 'hover:shadow-[0_0_40px_rgba(245,158,11,0.2)]',
    icon: 'bg-amber-500/15 text-amber-400',
  },
};

function StatCard({
  label, value, sub, color = 'violet', icon,
}: {
  label: string; value: string; sub?: string; color?: string; icon: string;
}) {
  const c = STAT_CONFIGS[color] ?? STAT_CONFIGS.violet;
  return (
    <div className={`relative overflow-hidden bg-gradient-to-br ${c.gradient} border ${c.border} ${c.hoverBorder} rounded-2xl p-4 transition-all duration-300 ${c.glow} group`}>
      <div className={`w-8 h-8 rounded-xl ${c.icon} flex items-center justify-center text-base mb-3`}>
        {icon}
      </div>
      <p className="text-zinc-500 text-xs mb-1 font-medium">{label}</p>
      <p className={`text-2xl font-bold ${c.text} leading-none`}>{value}</p>
      {sub && <p className="text-zinc-600 text-xs mt-1.5">{sub}</p>}
    </div>
  );
}

const LEVEL_CONFIGS: Record<string, { bar: string; text: string; bg: string; icon: string; glow: string }> = {
  básico:        { bar: 'from-emerald-500 to-emerald-400', text: 'text-emerald-400', bg: 'bg-emerald-500/10', icon: '🌱', glow: 'shadow-[0_0_12px_rgba(16,185,129,0.4)]' },
  intermediário: { bar: 'from-amber-500 to-amber-400',   text: 'text-amber-400',   bg: 'bg-amber-500/10',   icon: '🔥', glow: 'shadow-[0_0_12px_rgba(245,158,11,0.4)]' },
  avançado:      { bar: 'from-rose-500 to-rose-400',     text: 'text-rose-400',     bg: 'bg-rose-500/10',     icon: '⚡', glow: 'shadow-[0_0_12px_rgba(244,63,94,0.4)]'  },
};

export default function ProgressoPage() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    fetch('/api/stats')
      .then((r) => r.json())
      .then((data) => {
        setStats(data);
        setTimeout(() => setMounted(true), 100);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shadow-[0_0_30px_rgba(139,92,246,0.2)]">
            <span className="w-6 h-6 border-2 border-zinc-700 border-t-violet-400 rounded-full animate-spin" />
          </div>
          <p className="text-zinc-500 text-sm">Carregando progresso...</p>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  const { totals, planProgress, byLevel } = stats;
  const overallPct = totals.total_videos > 0
    ? Math.round((totals.watched_videos / totals.total_videos) * 100)
    : 0;

  const LEVEL_ORDER = ['básico', 'intermediário', 'avançado'];

  return (
    <main className="min-h-screen bg-zinc-950 text-white relative overflow-x-hidden">
      {/* Background blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 left-1/3 w-[500px] h-[500px] bg-violet-600/7 rounded-full blur-3xl animate-glow-pulse" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[300px] bg-cyan-600/5 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-white/[0.05] bg-zinc-950/80 backdrop-blur-xl px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="text-zinc-600 hover:text-zinc-400 transition-colors text-sm flex items-center gap-1.5 group"
            >
              <span className="group-hover:-translate-x-0.5 transition-transform inline-block">←</span> Início
            </Link>
            <div className="w-px h-4 bg-zinc-800" />
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center shadow-[0_0_15px_rgba(139,92,246,0.4)] text-sm">
                📊
              </div>
              <div>
                <h1 className="text-sm font-semibold bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent leading-none">
                  Dashboard de Progresso
                </h1>
                <p className="text-[10px] text-zinc-600 mt-0.5">Sua evolução nos estudos</p>
              </div>
            </div>
          </div>

          <div className="text-right">
            <p className="text-2xl font-bold bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent leading-none">
              {overallPct}%
            </p>
            <p className="text-[10px] text-zinc-600 mt-0.5">concluído</p>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8 flex flex-col gap-8 relative">

        {/* Stats cards */}
        <section className="animate-slide-up">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-1 h-5 bg-gradient-to-b from-violet-400 to-violet-700 rounded-full" />
            <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-[0.12em]">Visão Geral</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="Progresso" value={`${overallPct}%`} sub={`${totals.watched_videos} de ${totals.total_videos} vídeos`} color="violet" icon="📈" />
            <StatCard label="Horas assistidas" value={formatMinutes(totals.watched_minutes)} sub={`de ${formatMinutes(totals.total_minutes)}`} color="emerald" icon="⏱️" />
            <StatCard label="Planos criados" value={String(stats.plansCount)} sub="planos de estudo" color="blue" icon="📋" />
          </div>
        </section>

        {/* Barra de progresso geral */}
        <section className="relative overflow-hidden bg-zinc-900/60 backdrop-blur-sm border border-zinc-700/40 rounded-2xl px-6 py-5 animate-slide-up" style={{ animationDelay: '0.05s' }}>
          <div className="absolute inset-0 bg-gradient-to-br from-violet-600/5 to-transparent pointer-events-none rounded-2xl" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-px bg-gradient-to-r from-transparent via-violet-500/30 to-transparent" />

          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-semibold text-white">Progresso Geral</p>
              <p className="text-xs text-zinc-600 mt-0.5">
                {totals.watched_videos} vídeos · {formatMinutes(totals.watched_minutes)} estudados
              </p>
            </div>
            <p className="text-3xl font-bold bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent">
              {overallPct}%
            </p>
          </div>

          <div className="h-4 bg-zinc-800/80 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-violet-600 via-violet-400 to-cyan-400 rounded-full transition-all duration-1000 ease-out relative overflow-hidden"
              style={{ width: mounted ? `${overallPct}%` : '0%' }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent animate-shimmer" />
            </div>
          </div>

          <div className="flex justify-between text-xs text-zinc-700 mt-2">
            <span>0%</span>
            <span>100%</span>
          </div>
        </section>

        {/* Por nível */}
        {byLevel.length > 0 && (
          <section className="animate-slide-up" style={{ animationDelay: '0.1s' }}>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-1 h-5 bg-gradient-to-b from-amber-400 to-amber-700 rounded-full" />
              <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-[0.12em]">Por Nível</h2>
            </div>
            <div className="bg-zinc-900/60 backdrop-blur-sm border border-zinc-700/40 rounded-2xl px-5 py-5 flex flex-col gap-5">
              {LEVEL_ORDER.map((level) => {
                const data = byLevel.find((b) => b.level === level);
                if (!data) return null;
                const pct = data.total > 0 ? Math.round((data.watched / data.total) * 100) : 0;
                const cfg = LEVEL_CONFIGS[level] ?? { bar: 'from-zinc-500 to-zinc-400', text: 'text-zinc-400', bg: 'bg-zinc-500/10', icon: '•', glow: '' };

                return (
                  <div key={level}>
                    <div className="flex items-center justify-between mb-2.5">
                      <div className="flex items-center gap-2.5">
                        <span className={`w-8 h-8 rounded-xl ${cfg.bg} flex items-center justify-center text-sm`}>
                          {cfg.icon}
                        </span>
                        <div>
                          <span className={`text-sm font-semibold capitalize ${cfg.text}`}>{level}</span>
                          <span className="text-xs text-zinc-600 ml-2">{data.watched}/{data.total} vídeos</span>
                        </div>
                      </div>
                      <span className={`text-sm font-bold ${cfg.text}`}>{pct}%</span>
                    </div>
                    <div className="h-2.5 bg-zinc-800/80 rounded-full overflow-hidden">
                      <div
                        className={`h-full bg-gradient-to-r ${cfg.bar} rounded-full transition-all duration-1000 ease-out relative overflow-hidden`}
                        style={{ width: mounted ? `${pct}%` : '0%' }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/25 to-transparent animate-shimmer" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Por plano */}
        {planProgress.length > 0 && (
          <section className="animate-slide-up" style={{ animationDelay: '0.15s' }}>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-1 h-5 bg-gradient-to-b from-cyan-400 to-cyan-700 rounded-full" />
              <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-[0.12em]">Por Plano</h2>
            </div>
            <div className="flex flex-col gap-3">
              {planProgress.map((plan, i) => {
                const pct = plan.total_videos > 0
                  ? Math.round((plan.watched_videos / plan.total_videos) * 100)
                  : 0;
                const topics: string[] = JSON.parse(plan.topics);
                const daysRemaining = Math.ceil(
                  ((plan.total_minutes - plan.watched_minutes) / 60) / plan.hours_per_day
                );
                const isComplete = pct === 100;

                return (
                  <div
                    key={plan.id}
                    className={`relative overflow-hidden bg-zinc-900/60 backdrop-blur-sm border rounded-2xl px-5 py-4 transition-all duration-300 animate-slide-up ${
                      isComplete
                        ? 'border-emerald-500/30 hover:border-emerald-500/50 hover:shadow-[0_0_30px_rgba(16,185,129,0.1)]'
                        : 'border-zinc-700/40 hover:border-violet-500/40 hover:shadow-[0_0_30px_rgba(139,92,246,0.08)]'
                    }`}
                    style={{ animationDelay: `${0.05 * i}s` }}
                  >
                    {isComplete && (
                      <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/5 to-transparent pointer-events-none" />
                    )}

                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          {isComplete && (
                            <span className="inline-flex items-center gap-1 text-emerald-400 text-xs font-semibold bg-emerald-900/30 border border-emerald-700/50 px-2 py-0.5 rounded-full">
                              ✓ Concluído
                            </span>
                          )}
                          <Link
                            href={`/plano?id=${plan.id}`}
                            className="text-white font-semibold text-sm hover:text-violet-400 transition-colors truncate"
                          >
                            {plan.title}
                          </Link>
                        </div>
                        <div className="flex gap-1.5 flex-wrap">
                          {topics.map((t) => (
                            <span key={t} className="text-xs bg-zinc-800/80 text-zinc-500 px-2 py-0.5 rounded-full border border-zinc-700/40">
                              {t}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className={`text-2xl font-bold leading-none ${isComplete ? 'text-emerald-400' : 'bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent'}`}>
                          {pct}%
                        </p>
                        <p className="text-xs text-zinc-600 mt-1">{plan.watched_videos}/{plan.total_videos}</p>
                      </div>
                    </div>

                    <div className="h-2 bg-zinc-800/80 rounded-full overflow-hidden mb-2">
                      <div
                        className={`h-full rounded-full transition-all duration-1000 ease-out relative overflow-hidden ${
                          isComplete
                            ? 'bg-gradient-to-r from-emerald-500 to-emerald-400'
                            : 'bg-gradient-to-r from-violet-600 via-violet-400 to-cyan-400'
                        }`}
                        style={{ width: mounted ? `${pct}%` : '0%' }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <p className="text-xs text-zinc-600">
                        {formatMinutes(plan.watched_minutes)} de {formatMinutes(plan.total_minutes)}
                      </p>
                      {!isComplete && daysRemaining > 0 && (
                        <p className="text-xs text-zinc-600 flex items-center gap-1">
                          📅 ~{daysRemaining} dias restantes
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {planProgress.length === 0 && (
          <div className="text-center py-20 animate-fade-in">
            <div className="text-5xl mb-4 inline-block animate-float">📊</div>
            <p className="text-zinc-500 text-sm">Nenhum plano criado ainda</p>
            <Link href="/" className="text-violet-400 hover:text-violet-300 text-sm mt-3 inline-block hover:underline transition-colors">
              Criar meu primeiro plano →
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
