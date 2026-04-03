'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import PlanDayCard from '@/components/PlanDayCard';
import MindMapModal from '@/components/MindMapModal';
import Link from 'next/link';
import { Suspense } from 'react';

interface Video {
  id: number;
  plan_id: number;
  day: number;
  title: string;
  youtube_url: string;
  duration_minutes: number;
  description: string;
  channel_name: string;
  level: string;
  watched: number;
  notes?: string;
  order_in_day: number;
  day_theme?: string;
}

interface Plan {
  id: number;
  title: string;
  topics: string;
  hours_per_day: number;
  total_days: number;
  created_at: string;
}

function PlanoContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const planId = searchParams.get('id');

  const [plan, setPlan] = useState<Plan | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [selectedDay, setSelectedDay] = useState(1);
  const [loading, setLoading] = useState(true);
  const [mindMap, setMindMap] = useState<{ day?: number } | null>(null);

  useEffect(() => {
    if (!planId) {
      router.push('/');
      return;
    }
    loadData();
  }, [planId]);

  async function loadData() {
    setLoading(true);
    try {
      const [plansRes, videosRes] = await Promise.all([
        fetch('/api/plano'),
        fetch(`/api/plano/videos?planId=${planId}`),
      ]);
      const plans: Plan[] = await plansRes.json();
      const vids: Video[] = await videosRes.json();

      const found = plans.find((p) => p.id === parseInt(planId!));
      if (found) setPlan(found);
      setVideos(vids);
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleWatched(videoId: number, watched: boolean) {
    setVideos((prev) =>
      prev.map((v) => (v.id === videoId ? { ...v, watched: watched ? 1 : 0 } : v))
    );
    await fetch(`/api/plano/videos?id=${videoId}&watched=${watched ? 1 : 0}`, {
      method: 'PATCH',
    });
  }

  async function handleSaveNotes(videoId: number, notes: string) {
    setVideos((prev) =>
      prev.map((v) => (v.id === videoId ? { ...v, notes } : v))
    );
    await fetch(`/api/plano/videos?id=${videoId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes }),
    });
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shadow-[0_0_30px_rgba(139,92,246,0.2)]">
            <span className="w-6 h-6 border-2 border-zinc-700 border-t-violet-400 rounded-full animate-spin" />
          </div>
          <p className="text-zinc-500 text-sm">Carregando plano...</p>
        </div>
      </div>
    );
  }

  if (!plan) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-zinc-400 text-sm mb-4">Plano não encontrado</p>
          <Link href="/" className="text-violet-400 hover:text-violet-300 hover:underline text-sm transition-colors">
            Voltar para início
          </Link>
        </div>
      </div>
    );
  }

  const days = Array.from(new Set(videos.map((v) => v.day))).sort((a, b) => a - b);
  const videosOnDay = videos.filter((v) => v.day === selectedDay);
  const totalWatched = videos.filter((v) => v.watched).length;
  const progress = videos.length > 0 ? Math.round((totalWatched / videos.length) * 100) : 0;
  const topics: string[] = plan ? JSON.parse(plan.topics) : [];

  return (
    <main className="min-h-screen bg-zinc-950 text-white relative">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 right-0 w-[500px] h-[500px] bg-violet-600/6 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[300px] bg-cyan-600/4 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-white/[0.05] bg-zinc-950/85 backdrop-blur-xl px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <Link
              href="/"
              className="text-zinc-600 hover:text-zinc-400 transition-colors text-sm flex-shrink-0 flex items-center gap-1 group"
            >
              <span className="group-hover:-translate-x-0.5 transition-transform inline-block">←</span> Início
            </Link>
            <div className="w-px h-4 bg-zinc-800 flex-shrink-0" />
            <div className="min-w-0">
              <h1 className="text-sm font-semibold text-white truncate">{plan.title}</h1>
              <div className="flex gap-1.5 mt-0.5 flex-wrap">
                {topics.map((t) => (
                  <span key={t} className="text-xs bg-zinc-800/80 text-zinc-500 px-2 py-0.5 rounded-full border border-zinc-700/40">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="text-right flex-shrink-0">
            <p className="text-lg font-bold bg-gradient-to-r from-violet-400 to-cyan-400 bg-clip-text text-transparent leading-none">
              {progress}%
            </p>
            <p className="text-xs text-zinc-600 mt-0.5">{totalWatched}/{videos.length} vídeos</p>
          </div>
        </div>

        {/* Barra de progresso */}
        <div className="max-w-4xl mx-auto mt-3">
          <div className="h-1 bg-zinc-800/80 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-violet-600 via-violet-400 to-cyan-400 rounded-full transition-all duration-700 relative overflow-hidden"
              style={{ width: `${progress}%` }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-6 flex flex-col gap-6 relative">
        {/* Botões de mapa mental */}
        <div className="flex gap-2 flex-wrap animate-slide-up">
          <button
            onClick={() => setMindMap({ day: selectedDay })}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-violet-600/15 hover:bg-violet-600/25 border border-violet-500/30 hover:border-violet-500/50 text-violet-400 text-xs font-semibold rounded-xl transition-all"
          >
            🗺️ Mapa do Dia {selectedDay}
          </button>
          <button
            onClick={() => setMindMap({})}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-zinc-800/60 hover:bg-zinc-800 border border-zinc-700/40 hover:border-zinc-600 text-zinc-400 text-xs font-semibold rounded-xl transition-all"
          >
            🗺️ Mapa Completo
          </button>
        </div>

        {/* Seletor de dias */}
        <div className="flex gap-2 flex-wrap animate-slide-up">
          {days.map((day) => {
            const dayVideos = videos.filter((v) => v.day === day);
            const allWatched = dayVideos.every((v) => v.watched);
            const isActive = selectedDay === day;

            return (
              <button
                key={day}
                onClick={() => setSelectedDay(day)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all duration-200 flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-gradient-to-r from-violet-600 to-violet-500 text-white shadow-[0_0_20px_rgba(139,92,246,0.5)] border border-violet-500'
                    : allWatched
                    ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-700/50 hover:border-emerald-600/70'
                    : 'bg-zinc-800/60 text-zinc-400 border border-zinc-700/40 hover:bg-zinc-800 hover:text-zinc-200 hover:border-zinc-600/60'
                }`}
              >
                {allWatched && !isActive && (
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                )}
                Dia {day}
              </button>
            );
          })}
        </div>

        {/* Card do dia */}
        {videosOnDay.length > 0 ? (
          <div className="animate-slide-up" style={{ animationDelay: '0.05s' }}>
            <PlanDayCard
              day={selectedDay}
              theme={videosOnDay[0]?.day_theme ?? undefined}
              videos={videosOnDay}
              onToggleWatched={handleToggleWatched}
              onSaveNotes={handleSaveNotes}
            />
          </div>
        ) : (
          <div className="text-center py-12 text-zinc-600 text-sm">
            Nenhum vídeo para este dia
          </div>
        )}
      </div>

      {mindMap !== null && plan && (
        <MindMapModal
          planId={plan.id}
          planTitle={plan.title}
          day={mindMap.day}
          onClose={() => setMindMap(null)}
        />
      )}
    </main>
  );
}

export default function PlanoPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
            <span className="w-6 h-6 border-2 border-zinc-700 border-t-violet-400 rounded-full animate-spin" />
          </div>
          <p className="text-zinc-500 text-sm">Carregando...</p>
        </div>
      </div>
    }>
      <PlanoContent />
    </Suspense>
  );
}
