'use client';

import { useState } from 'react';

interface Video {
  id: number;
  title: string;
  youtube_url: string;
  duration_minutes: number;
  description: string;
  channel_name: string;
  level: string;
  watched: number;
  notes?: string;
  day_theme?: string;
}

interface Props {
  day: number;
  theme?: string;
  videos: Video[];
  onToggleWatched: (videoId: number, watched: boolean) => void;
  onSaveNotes?: (videoId: number, notes: string) => void;
}

const LEVEL_CONFIGS: Record<string, { badge: string; dot: string }> = {
  básico:        { badge: 'bg-emerald-900/40 text-emerald-400 border-emerald-700/60', dot: 'bg-emerald-400' },
  intermediário: { badge: 'bg-amber-900/40  text-amber-400  border-amber-700/60',   dot: 'bg-amber-400'  },
  avançado:      { badge: 'bg-rose-900/40   text-rose-400   border-rose-700/60',     dot: 'bg-rose-400'   },
};

function formatDuration(minutes: number) {
  if (minutes < 60) return `${minutes}min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

function getVideoId(url: string): string {
  try {
    return new URL(url).searchParams.get('v') ?? '';
  } catch {
    return '';
  }
}

/* ─── Player Modal ─────────────────────────────────────────────────────────── */
function VideoPlayerModal({ video, onClose, onWatched }: {
  video: Video;
  onClose: () => void;
  onWatched: () => void;
}) {
  const videoId = getVideoId(video.youtube_url);

  return (
    <div
      className="fixed inset-0 bg-black/92 backdrop-blur-sm z-50 flex flex-col items-center justify-center p-4 animate-fade-in"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-4xl flex flex-col gap-3 animate-slide-up">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-semibold text-sm leading-snug line-clamp-2">{video.title}</h3>
            <p className="text-zinc-500 text-xs mt-1">
              {video.channel_name} · {formatDuration(video.duration_minutes)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 w-9 h-9 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 border border-zinc-700/60 flex items-center justify-center text-zinc-400 hover:text-white transition-all"
          >
            ✕
          </button>
        </div>

        {/* Player */}
        <div
          className="relative w-full bg-black rounded-2xl overflow-hidden border border-zinc-800/60 shadow-[0_0_60px_rgba(0,0,0,0.8)]"
          style={{ aspectRatio: '16/9' }}
        >
          {videoId ? (
            <iframe
              src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`}
              title={video.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="absolute inset-0 w-full h-full"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-zinc-600 text-sm">
              Vídeo indisponível
            </div>
          )}
        </div>

        {/* Ações */}
        <div className="flex items-center justify-between">
          <a
            href={video.youtube_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors flex items-center gap-1"
          >
            Abrir no YouTube ↗
          </a>
          {!video.watched && (
            <button
              onClick={() => { onWatched(); onClose(); }}
              className="px-5 py-2.5 bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400 text-white text-sm rounded-xl transition-all font-semibold shadow-[0_0_20px_rgba(139,92,246,0.4)] hover:shadow-[0_0_30px_rgba(139,92,246,0.6)] flex items-center gap-2"
            >
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

/* ─── Notes Area ───────────────────────────────────────────────────────────── */
function NotesArea({ video, onSave }: { video: Video; onSave: (notes: string) => void }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(video.notes ?? '');
  const [saved, setSaved] = useState(false);

  function handleSave() {
    onSave(text);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-xs text-zinc-600 hover:text-violet-400 transition-colors group"
      >
        <svg className="w-3 h-3 group-hover:text-violet-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
        {video.notes ? (
          <span className="text-violet-500 group-hover:text-violet-400">Ver anotações</span>
        ) : (
          'Adicionar nota'
        )}
      </button>
    );
  }

  return (
    <div className="mt-2.5 flex flex-col gap-2 animate-slide-up">
      <textarea
        value={text}
        onChange={(e) => { setText(e.target.value); setSaved(false); }}
        placeholder="Suas anotações sobre este vídeo..."
        rows={3}
        className="w-full bg-zinc-800/70 border border-zinc-700/60 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500/70 focus:ring-1 focus:ring-violet-500/20 transition-all resize-none"
        autoFocus
      />
      <div className="flex items-center justify-between">
        <button
          onClick={() => setOpen(false)}
          className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors"
        >
          Fechar
        </button>
        <button
          onClick={handleSave}
          className={`text-xs px-3 py-1.5 rounded-lg transition-all font-medium ${
            saved
              ? 'bg-emerald-800/60 text-emerald-300 border border-emerald-700/50'
              : 'bg-zinc-700/80 hover:bg-zinc-600 text-zinc-200 border border-zinc-600/50'
          }`}
        >
          {saved ? '✓ Salvo' : 'Salvar nota'}
        </button>
      </div>
    </div>
  );
}

/* ─── Main Card ────────────────────────────────────────────────────────────── */
export default function PlanDayCard({ day, theme, videos, onToggleWatched, onSaveNotes }: Props) {
  const [playingVideo, setPlayingVideo] = useState<Video | null>(null);

  const totalMinutes = videos.reduce((sum, v) => sum + v.duration_minutes, 0);
  const watchedCount = videos.filter((v) => v.watched).length;
  const progress = videos.length > 0 ? (watchedCount / videos.length) * 100 : 0;
  const dayTheme = theme ?? videos[0]?.day_theme;
  const allDone = watchedCount === videos.length;

  return (
    <>
      <div className={`relative overflow-hidden bg-zinc-900/60 backdrop-blur-sm border rounded-2xl transition-all duration-300 ${
        allDone ? 'border-emerald-500/30' : 'border-zinc-700/40'
      }`}>
        {/* Brilho topo */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-500/20 to-transparent" />

        {/* Header */}
        <div className="px-5 py-4 border-b border-zinc-800/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
              allDone
                ? 'bg-emerald-500/15 border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                : 'bg-violet-500/15 border border-violet-500/30 shadow-[0_0_15px_rgba(139,92,246,0.2)]'
            }`}>
              {allDone ? (
                <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <span className={`font-bold text-sm ${allDone ? 'text-emerald-400' : 'text-violet-400'}`}>{day}</span>
              )}
            </div>
            <div>
              <h3 className="text-white font-semibold text-sm leading-none">
                Dia {day}
                {dayTheme && <span className="text-zinc-500 font-normal"> — {dayTheme}</span>}
              </h3>
              <p className="text-zinc-600 text-xs mt-1">{formatDuration(totalMinutes)} de conteúdo</p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="text-right">
              <p className="text-xs font-semibold text-zinc-300">{watchedCount}/{videos.length}</p>
              <div className="w-24 h-1.5 bg-zinc-800 rounded-full mt-1.5 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    allDone ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' : 'bg-gradient-to-r from-violet-600 to-violet-400'
                  }`}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Lista de vídeos */}
        <div className="divide-y divide-zinc-800/40">
          {videos.map((video, i) => {
            const videoId = getVideoId(video.youtube_url);
            const thumb = videoId
              ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`
              : null;
            const levelCfg = LEVEL_CONFIGS[video.level] ?? LEVEL_CONFIGS['básico'];

            return (
              <div
                key={video.id}
                className={`flex transition-all duration-200 animate-slide-up ${
                  video.watched ? 'opacity-50' : 'hover:bg-zinc-800/25'
                }`}
                style={{ animationDelay: `${0.04 * i}s` }}
              >
                {/* Checkbox lateral */}
                <button
                  onClick={() => onToggleWatched(video.id, !video.watched)}
                  title={video.watched ? 'Marcar como não assistido' : 'Marcar como assistido'}
                  className={`flex-shrink-0 w-12 flex items-center justify-center border-r border-zinc-800/50 transition-colors ${
                    video.watched ? 'bg-violet-600/10' : 'hover:bg-zinc-800/40'
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                    video.watched
                      ? 'bg-violet-600 border-violet-500 shadow-[0_0_10px_rgba(139,92,246,0.4)]'
                      : 'border-zinc-600 hover:border-zinc-400'
                  }`}>
                    {video.watched && (
                      <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </button>

                {/* Thumbnail */}
                {thumb && (
                  <button
                    onClick={() => setPlayingVideo(video)}
                    className="flex-shrink-0 w-32 overflow-hidden relative group self-stretch"
                  >
                    <img
                      src={thumb}
                      alt={video.title}
                      className={`w-full h-full object-cover transition-all duration-300 ${
                        video.watched ? 'opacity-30' : 'group-hover:scale-105 group-hover:opacity-80'
                      }`}
                      style={{ minHeight: '72px' }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="w-11 h-11 bg-black/70 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/20 shadow-xl">
                        <svg className="w-5 h-5 text-white ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M8 5v14l11-7z" />
                        </svg>
                      </div>
                    </div>
                  </button>
                )}

                {/* Conteúdo */}
                <div className="flex-1 min-w-0 p-3 flex flex-col gap-1">
                  <div className="flex items-start gap-2">
                    <button
                      onClick={() => setPlayingVideo(video)}
                      className={`flex-1 text-left font-semibold text-sm leading-snug transition-colors hover:text-violet-400 ${
                        video.watched ? 'line-through text-zinc-500' : 'text-zinc-100'
                      }`}
                    >
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
                    <span className="text-zinc-700 text-xs">·</span>
                    <a
                      href={video.youtube_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-zinc-600 hover:text-violet-400 transition-colors"
                    >
                      YouTube ↗
                    </a>
                  </div>

                  {video.description && (
                    <p className="text-xs text-zinc-600 leading-relaxed line-clamp-2">
                      {video.description}
                    </p>
                  )}

                  {onSaveNotes && (
                    <NotesArea
                      video={video}
                      onSave={(notes) => onSaveNotes(video.id, notes)}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Player modal */}
      {playingVideo && (
        <VideoPlayerModal
          video={playingVideo}
          onClose={() => setPlayingVideo(null)}
          onWatched={() => {
            onToggleWatched(playingVideo.id, true);
            setPlayingVideo(null);
          }}
        />
      )}
    </>
  );
}
