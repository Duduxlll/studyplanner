'use client';

import { useState } from 'react';

interface Props {
  onClose: () => void;
  onAdded: () => void;
}

function isPlaylistUrl(input: string): boolean {
  return input.includes('list=') &&
    (input.includes('youtube.com/playlist') || input.includes('youtube.com/watch'));
}

export default function AddChannelModal({ onClose, onAdded }: Props) {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<{ name: string; thumbnail: string; isPlaylist: boolean } | null>(null);

  const detectedPlaylist = isPlaylistUrl(input.trim());

  async function handleSubmit(e: { preventDefault(): void }) {
    e.preventDefault();
    if (!input.trim()) return;

    setLoading(true);
    setError('');
    setPreview(null);

    try {
      const ytRes = await fetch(`/api/youtube?q=${encodeURIComponent(input.trim())}`);
      const ytData = await ytRes.json();

      if (!ytRes.ok) throw new Error(ytData.error ?? 'Canal/Playlist não encontrado');

      const isPlaylist = ytData.isPlaylist ?? false;
      const sourceId = isPlaylist ? ytData.playlistId : ytData.channelId;
      const name = ytData.name;
      const thumbnail = ytData.thumbnail;
      const description = isPlaylist
        ? `Playlist do canal ${ytData.channelName}. ${ytData.description}`.slice(0, 300)
        : ytData.description;

      const saveRes = await fetch('/api/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          channel_id: sourceId,
          thumbnail,
          description,
          is_playlist: isPlaylist ? 1 : 0,
        }),
      });

      const saveData = await saveRes.json();
      if (!saveRes.ok) throw new Error(saveData.error ?? 'Erro ao salvar');

      onAdded();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao adicionar');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="relative bg-zinc-900/95 border border-zinc-700/60 rounded-2xl w-full max-w-md shadow-[0_0_80px_rgba(139,92,246,0.12)] animate-slide-up">
        {/* Linha de brilho superior */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-px bg-gradient-to-r from-transparent via-violet-500/40 to-transparent" />

        {/* Header */}
        <div className="px-6 py-5 border-b border-zinc-800/80">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center shadow-[0_0_15px_rgba(139,92,246,0.5)] text-sm">
                📺
              </div>
              <div>
                <h2 className="text-base font-semibold text-white leading-none">Adicionar Fonte</h2>
                <p className="text-xs text-zinc-500 mt-0.5">Canal ou playlist do YouTube</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-zinc-800/80 hover:bg-zinc-700 border border-zinc-700/60 flex items-center justify-center text-zinc-500 hover:text-zinc-300 transition-all"
            >
              ✕
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-4">
          {/* Input */}
          <div>
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2.5">
              URL ou nome do canal
            </label>
            <input
              type="text"
              value={input}
              onChange={(e) => { setInput(e.target.value); setPreview(null); setError(''); }}
              placeholder="@NomeDoCanal ou youtube.com/playlist?list=..."
              className="w-full bg-zinc-800/80 border border-zinc-700/60 rounded-xl px-4 py-3 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30 transition-all"
              autoFocus
            />

            {/* Indicador de tipo detectado */}
            {input.trim() && (
              <div className={`mt-2.5 flex items-center gap-2 text-xs px-3 py-2 rounded-lg border ${
                detectedPlaylist
                  ? 'bg-amber-950/30 border-amber-800/50 text-amber-400'
                  : 'bg-violet-950/30 border-violet-800/50 text-violet-400'
              }`}>
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${detectedPlaylist ? 'bg-amber-400' : 'bg-violet-400'} animate-pulse`} />
                {detectedPlaylist ? 'Detectado: Playlist do YouTube' : 'Detectado: Canal do YouTube'}
              </div>
            )}
          </div>

          {/* Dica de playlist */}
          <div className="bg-zinc-800/40 border border-zinc-700/40 rounded-xl px-4 py-3">
            <p className="text-xs font-semibold text-zinc-400 mb-1.5">Como adicionar uma playlist:</p>
            <p className="text-xs text-zinc-500">Cole a URL completa da playlist. Ex:</p>
            <p className="text-xs text-zinc-600 font-mono mt-1 break-all bg-zinc-900/60 px-2 py-1 rounded-lg">
              youtube.com/playlist?list=PLxxxx
            </p>
          </div>

          {/* Preview */}
          {preview && (
            <div className="flex items-center gap-3 bg-zinc-800/60 border border-zinc-700/50 rounded-xl p-3">
              {preview.thumbnail && (
                <img src={preview.thumbnail} alt={preview.name} className="w-11 h-11 rounded-full object-cover border-2 border-zinc-700" />
              )}
              <div>
                <p className="text-white text-sm font-semibold">{preview.name}</p>
                <p className="text-zinc-500 text-xs">{preview.isPlaylist ? '🎵 Playlist' : '📺 Canal'}</p>
              </div>
            </div>
          )}

          {/* Erro */}
          {error && (
            <div className="text-red-300 text-sm bg-red-950/40 border border-red-800/50 rounded-xl px-4 py-3 flex items-center gap-2">
              <span>⚠️</span> {error}
            </div>
          )}

          {/* Botões */}
          <div className="flex gap-3 justify-end pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-zinc-500 hover:text-zinc-300 transition-colors text-sm rounded-xl hover:bg-white/[0.05]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="px-6 py-2.5 bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400 disabled:from-zinc-700 disabled:to-zinc-700 disabled:text-zinc-500 text-white rounded-xl transition-all duration-300 font-semibold text-sm shadow-[0_0_20px_rgba(139,92,246,0.35)] hover:shadow-[0_0_30px_rgba(139,92,246,0.55)] disabled:shadow-none flex items-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Buscando...
                </>
              ) : (
                'Adicionar'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
