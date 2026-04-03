'use client';

import { useEffect, useState } from 'react';

interface Suggestion {
  name: string;
  channelId: string;
  thumbnail: string;
  description: string;
}

interface Props {
  topics: string[];
  onAdd: () => void;
}

export default function ChannelSuggestions({ topics, onAdd }: Props) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState<string | null>(null);

  useEffect(() => {
    loadSuggestions();
  }, [topics.join(',')]);

  async function loadSuggestions() {
    setLoading(true);
    try {
      const res = await fetch(`/api/suggestions?topics=${encodeURIComponent(topics.join(','))}`);
      const data = await res.json();
      setSuggestions(data.channels ?? []);
    } catch {
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd(s: Suggestion) {
    setAdding(s.channelId);
    try {
      await fetch('/api/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: s.name,
          channel_id: s.channelId,
          thumbnail: s.thumbnail,
          description: s.description,
        }),
      });
      setDismissed((prev) => new Set([...prev, s.channelId]));
      onAdd();
    } finally {
      setAdding(null);
    }
  }

  const visible = suggestions.filter((s) => !dismissed.has(s.channelId));

  if (loading) {
    return (
      <section>
        <h2 className="text-sm font-medium text-zinc-500 mb-3">Talvez você goste</h2>
        <div className="flex items-center gap-2 text-zinc-600 text-sm py-2">
          <span className="inline-block w-3 h-3 border-2 border-zinc-700 border-t-violet-500 rounded-full animate-spin" />
          Buscando sugestões de canais...
        </div>
      </section>
    );
  }

  if (!visible.length) return null;

  return (
    <section>
      <h2 className="text-sm font-medium text-zinc-500 mb-3">Talvez você goste</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {visible.map((s) => (
          <div key={s.channelId} className="flex items-start gap-3 bg-zinc-900 border border-zinc-800 rounded-xl p-3">

            {/* Foto real do canal */}
            <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 bg-zinc-700 border border-zinc-600">
              {s.thumbnail
                ? <img src={s.thumbnail} alt={s.name} className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center text-white font-bold text-sm">{s.name.charAt(0)}</div>
              }
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">{s.name}</p>
              <p className="text-zinc-500 text-xs mt-0.5 line-clamp-2">{s.description}</p>
            </div>

            <div className="flex flex-col gap-1 flex-shrink-0">
              <button
                onClick={() => handleAdd(s)}
                disabled={adding === s.channelId}
                className="px-2.5 py-1 bg-violet-600 hover:bg-violet-500 disabled:bg-zinc-700 text-white text-xs rounded-lg transition-colors font-medium min-w-[48px] text-center"
              >
                {adding === s.channelId ? '...' : '+ Add'}
              </button>
              <button
                onClick={() => setDismissed((prev) => new Set([...prev, s.channelId]))}
                className="px-2.5 py-1 text-zinc-600 hover:text-zinc-400 text-xs rounded-lg transition-colors text-center"
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
