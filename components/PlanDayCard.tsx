'use client';

import { useState } from 'react';
import type { AISummary } from '@/app/api/notes/ai/route';

interface Video {
  id: number;
  title: string;
  youtube_url: string;
  duration_minutes: number;
  description: string;
  channel_name: string;
  level: string;
  watched: number;
  watched_at?: string;
  notes?: string;
  ai_summary?: string;
  day_theme?: string;
}

interface Props {
  day: number;
  theme?: string;
  videos: Video[];
  onToggleWatched: (videoId: number, watched: boolean) => void;
  onSaveNotes?: (videoId: number, notes: string) => void;
  onAiSummary?: (videoId: number, summary: string) => void;
  onQuiz?: () => void;
}

const LEVEL_CONFIGS: Record<string, { badge: string }> = {
  básico:        { badge: 'bg-emerald-900/40 text-emerald-400 border-emerald-700/60' },
  intermediário: { badge: 'bg-amber-900/40  text-amber-400  border-amber-700/60'   },
  avançado:      { badge: 'bg-rose-900/40   text-rose-400   border-rose-700/60'     },
};

function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes}min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

function formatWatchedAt(iso?: string) {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffH = diffMs / 3600000;
  if (diffH < 1) return 'há poucos minutos';
  if (diffH < 24) return `hoje às ${d.getHours()}h${String(d.getMinutes()).padStart(2, '0')}`;
  if (diffH < 48) return 'ontem';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

function getVideoId(url: string): string {
  try { return new URL(url).searchParams.get('v') ?? ''; } catch { return ''; }
}

/* ─── AI Summary Panel ─────────────────────────────────────────────────────── */
function AISummaryPanel({ video, onGenerated }: {
  video: Video;
  onGenerated: (summary: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<AISummary | null>(() => {
    if (!video.ai_summary) return null;
    try { return JSON.parse(video.ai_summary); } catch { return null; }
  });
  const [error, setError] = useState('');

  async function generate() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/notes/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoId: video.id }),
      });
      const json = await res.json();
      if (!res.ok) { setError(json.error ?? 'Erro'); return; }
      const summary: AISummary = { summary: json.summary, keyPoints: json.keyPoints, whyItMatters: json.whyItMatters };
      setData(summary);
      onGenerated(JSON.stringify(summary));
    } catch {
      setError('Erro de conexão.');
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => { setOpen(true); if (!data) generate(); }}
        className="flex items-center gap-1.5 text-xs text-zinc-600 hover:text-violet-400 transition-colors group"
      >
        <span className="text-sm">✨</span>
        <span className={data ? 'text-violet-500 group-hover:text-violet-400' : ''}>
          {data ? 'Resumo IA' : 'Gerar resumo IA'}
        </span>
      </button>
    );
  }

  return (
    <div className="mt-2 rounded-xl border border-violet-500/20 bg-violet-950/20 overflow-hidden animate-slide-up">
      <div className="flex items-center justify-between px-3 py-2 border-b border-violet-500/10">
        <span className="text-xs font-semibold text-violet-400 flex items-center gap-1.5">
          ✨ Resumo IA
        </span>
        <button onClick={() => setOpen(false)} className="text-zinc-600 hover:text-zinc-400 text-xs transition-colors">fechar</button>
      </div>
      <div className="px-3 py-3">
        {loading && (
          <div className="flex items-center gap-2 text-xs text-zinc-500 py-1">
            <span className="w-3 h-3 border border-violet-600 border-t-violet-300 rounded-full animate-spin" />
            Gerando resumo...
          </div>
        )}
        {error && <p className="text-xs text-red-400">{error}</p>}
        {data && (
          <div className="flex flex-col gap-3">
            <p className="text-xs text-zinc-300 leading-relaxed">{data.summary}</p>
            <div className="flex flex-col gap-1.5">
              {data.keyPoints.map((p, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-zinc-400">
                  <span className="flex-shrink-0 w-4 h-4 rounded-full bg-violet-600/30 border border-violet-500/40 flex items-center justify-center text-violet-400 font-bold mt-0.5" style={{ fontSize: 9 }}>{i + 1}</span>
                  <span className="leading-relaxed">{p}</span>
                </div>
              ))}
            </div>
            {data.whyItMatters && (
              <div className="bg-zinc-800/50 border border-zinc-700/40 rounded-lg px-3 py-2">
                <p className="text-xs text-zinc-500 leading-relaxed">
                  <span className="text-zinc-400 font-medium">Por que importa: </span>
                  {data.whyItMatters}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Notes Area ───────────────────────────────────────────────────────────── */
function NotesArea({ video, onSave }: { video: Video; onSave: (notes: string) => void }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(video.notes ?? '');
  const [saved, setSaved] = useState(false);

  if (!open) {
    return (
      <button onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-xs text-zinc-600 hover:text-violet-400 transition-colors group">
        <svg className="w-3 h-3 group-hover:text-violet-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
        <span className={video.notes ? 'text-violet-500 group-hover:text-violet-400' : ''}>
          {video.notes ? 'Ver anotações' : 'Adicionar nota'}
        </span>
      </button>
    );
  }

  return (
    <div className="mt-2 flex flex-col gap-2 animate-slide-up">
      <textarea value={text} onChange={e => { setText(e.target.value); setSaved(false); }}
        placeholder="Suas anotações sobre este vídeo..." rows={3} autoFocus
        className="w-full bg-zinc-800/70 border border-zinc-700/60 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500/70 focus:ring-1 focus:ring-violet-500/20 transition-all resize-none" />
      <div className="flex items-center justify-between">
        <button onClick={() => setOpen(false)} className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors">Fechar</button>
        <button onClick={() => { onSave(text); setSaved(true); setTimeout(() => setSaved(false), 2000); }}
          className={`text-xs px-3 py-1.5 rounded-lg transition-all font-medium ${saved ? 'bg-emerald-800/60 text-emerald-300 border border-emerald-700/50' : 'bg-zinc-700/80 hover:bg-zinc-600 text-zinc-200 border border-zinc-600/50'}`}>
          {saved ? '✓ Salvo' : 'Salvar nota'}
        </button>
      </div>
    </div>
  );
}

/* ─── Player Modal ─────────────────────────────────────────────────────────── */
function VideoPlayerModal({ video, onClose, onWatched }: {
  video: Video; onClose: () => void; onWatched: () => void;
}) {
  const videoId = getVideoId(video.youtube_url);
  return (
    <div className="fixed inset-0 bg-black/92 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-4 animate-fade-in"
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-4xl flex flex-col gap-3 animate-slide-up">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-semibold text-sm leading-snug line-clamp-2">{video.title}</h3>
            <p className="text-zinc-500 text-xs mt-1">{video.channel_name} · {formatDuration(video.duration_minutes)}</p>
          </div>
          <button onClick={onClose} className="flex-shrink-0 w-9 h-9 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 border border-zinc-700/60 flex items-center justify-center text-zinc-400 hover:text-white transition-all">✕</button>
        </div>
        <div className="relative w-full bg-black rounded-2xl overflow-hidden border border-zinc-800/60 shadow-[0_0_60px_rgba(0,0,0,0.8)]" style={{ aspectRatio: '16/9' }}>
          {videoId ? (
            <iframe src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`} title={video.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen className="absolute inset-0 w-full h-full" />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-zinc-600 text-sm">Vídeo indisponível</div>
          )}
        </div>
        <div className="flex items-center justify-between">
          <a href={video.youtube_url} target="_blank" rel="noopener noreferrer"
            className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors">Abrir no YouTube ↗</a>
          {!video.watched && (
            <button onClick={() => { onWatched(); onClose(); }}
              className="px-5 py-2.5 bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400 text-white text-sm rounded-xl transition-all font-semibold shadow-[0_0_20px_rgba(139,92,246,0.4)] flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              Marcar como assistido
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Main Card ────────────────────────────────────────────────────────────── */
export default function PlanDayCard({ day, theme, videos, onToggleWatched, onSaveNotes, onAiSummary, onQuiz }: Props) {
  const [playingVideo, setPlayingVideo] = useState<Video | null>(null);

  const totalMinutes = videos.reduce((sum, v) => sum + v.duration_minutes, 0);
  const watchedCount = videos.filter(v => v.watched).length;
  const progress = videos.length > 0 ? (watchedCount / videos.length) * 100 : 0;
  const dayTheme = theme ?? videos[0]?.day_theme;
  const allDone = watchedCount === videos.length && videos.length > 0;

  return (
    <>
      <div className={`relative overflow-hidden bg-zinc-900/60 backdrop-blur-sm border rounded-2xl transition-all duration-300 ${allDone ? 'border-emerald-500/30' : 'border-zinc-700/40'}`}>
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-500/20 to-transparent" />

        {/* Header */}
        <div className="px-5 py-4 border-b border-zinc-800/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${allDone ? 'bg-emerald-500/15 border border-emerald-500/30' : 'bg-violet-500/15 border border-violet-500/30'}`}>
                {allDone ? (
                  <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <span className="font-bold text-sm text-violet-400">{day}</span>
                )}
              </div>
              <div>
                <h3 className="text-white font-semibold text-sm leading-none">
                  Dia {day}
                  {dayTheme && <span className="text-zinc-500 font-normal"> — {dayTheme}</span>}
                </h3>
                <p className="text-zinc-600 text-xs mt-1">{formatDuration(totalMinutes)} de conteúdo · {watchedCount}/{videos.length} assistidos</p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 flex-shrink-0">
              {/* Barra de progresso */}
              <div className="text-right">
                <div className="w-20 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full transition-all duration-500 ${allDone ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' : 'bg-gradient-to-r from-violet-600 to-violet-400'}`}
                    style={{ width: `${progress}%` }} />
                </div>
              </div>
              {/* Quiz button */}
              {onQuiz && (
                <button onClick={onQuiz}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800/80 hover:bg-violet-600/20 border border-zinc-700/60 hover:border-violet-500/50 text-zinc-400 hover:text-violet-400 text-xs font-semibold rounded-xl transition-all"
                  title="Fazer quiz deste dia">
                  🧪 Quiz
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Vídeos */}
        <div className="divide-y divide-zinc-800/40">
          {videos.map((video, i) => {
            const videoId = getVideoId(video.youtube_url);
            const thumb = videoId ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` : null;
            const levelCfg = LEVEL_CONFIGS[video.level] ?? LEVEL_CONFIGS['básico'];

            return (
              <div key={video.id} className={`flex flex-col transition-all duration-200 animate-slide-up ${video.watched ? '' : 'hover:bg-zinc-800/20'}`}
                style={{ animationDelay: `${0.04 * i}s` }}>
                <div className="flex">
                  {/* Checkbox */}
                  <button onClick={() => onToggleWatched(video.id, !video.watched)}
                    title={video.watched ? 'Desmarcar' : 'Marcar como assistido'}
                    className={`flex-shrink-0 w-12 flex items-center justify-center border-r border-zinc-800/50 transition-colors ${video.watched ? 'bg-violet-600/8' : 'hover:bg-zinc-800/40'}`}>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${video.watched ? 'bg-violet-600 border-violet-500 shadow-[0_0_10px_rgba(139,92,246,0.4)]' : 'border-zinc-600 hover:border-zinc-400'}`}>
                      {video.watched && (
                        <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  </button>

                  {/* Thumbnail */}
                  {thumb && (
                    <button onClick={() => setPlayingVideo(video)}
                      className={`flex-shrink-0 w-32 overflow-hidden relative group self-stretch ${video.watched ? 'opacity-40' : ''}`}>
                      <img src={thumb} alt={video.title}
                        className="w-full h-full object-cover transition-all duration-300 group-hover:scale-105 group-hover:opacity-80"
                        style={{ minHeight: '72px' }} />
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="w-11 h-11 bg-black/70 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/20 shadow-xl">
                          <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                        </div>
                      </div>
                    </button>
                  )}

                  {/* Info */}
                  <div className={`flex-1 min-w-0 p-3 flex flex-col gap-1 ${video.watched ? 'opacity-55' : ''}`}>
                    <div className="flex items-start gap-2">
                      <button onClick={() => setPlayingVideo(video)}
                        className={`flex-1 text-left font-semibold text-sm leading-snug transition-colors hover:text-violet-400 ${video.watched ? 'line-through text-zinc-500' : 'text-zinc-100'}`}>
                        {video.title}
                      </button>
                      <span className={`flex-shrink-0 text-[10px] px-2 py-0.5 rounded-full border font-medium ${levelCfg.badge}`}>
                        {video.level}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-zinc-500">{video.channel_name}</span>
                      <span className="text-zinc-700 text-xs">·</span>
                      <span className="text-xs text-zinc-500">{formatDuration(video.duration_minutes)}</span>
                      {video.watched && video.watched_at && (
                        <>
                          <span className="text-zinc-700 text-xs">·</span>
                          <span className="text-xs text-violet-600">✓ {formatWatchedAt(video.watched_at)}</span>
                        </>
                      )}
                      <span className="text-zinc-700 text-xs">·</span>
                      <a href={video.youtube_url} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-zinc-600 hover:text-violet-400 transition-colors">YouTube ↗</a>
                    </div>

                    {video.description && (
                      <p className="text-xs text-zinc-600 leading-relaxed line-clamp-2">{video.description}</p>
                    )}
                  </div>
                </div>

                {/* AI Summary + Notes (abaixo, fora do flex row) */}
                <div className="px-3 pb-3 flex flex-col gap-2 ml-12">
                  {onAiSummary && (
                    <AISummaryPanel
                      video={video}
                      onGenerated={summary => onAiSummary(video.id, summary)}
                    />
                  )}
                  {onSaveNotes && (
                    <NotesArea video={video} onSave={notes => onSaveNotes(video.id, notes)} />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {playingVideo && (
        <VideoPlayerModal video={playingVideo} onClose={() => setPlayingVideo(null)}
          onWatched={() => { onToggleWatched(playingVideo.id, true); setPlayingVideo(null); }} />
      )}
    </>
  );
}
