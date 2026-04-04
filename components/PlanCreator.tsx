'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const TOPICS_SUGERIDOS = [
  { id: 'programação', label: 'Programação' },
  { id: 'cloud', label: 'Cloud' },
  { id: 'web development', label: 'Web Dev' },
  { id: 'agentes IA', label: 'Agentes IA' },
  { id: 'vibe coding', label: 'Vibe Coding' },
  { id: 'python', label: 'Python' },
  { id: 'javascript', label: 'JavaScript' },
  { id: 'docker kubernetes', label: 'DevOps' },
];

const TOPICS_ENEM = [
  { id: 'matemática', label: 'Matemática' },
  { id: 'português redação', label: 'Português/Redação' },
  { id: 'biologia química física', label: 'Ciências da Natureza' },
  { id: 'história geografia filosofia sociologia', label: 'Ciências Humanas' },
];

interface Props {
  onClose: () => void;
}

export default function PlanCreator({ onClose }: Props) {
  const router = useRouter();
  const [selectedTopics, setSelectedTopics] = useState<string[]>(['programação']);
  const [customInput, setCustomInput] = useState('');
  const [hoursPerDay, setHoursPerDay] = useState(2);
  const [totalDays, setTotalDays] = useState(7);
  const [instructions, setInstructions] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');

  function toggleTopic(id: string) {
    setSelectedTopics((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  }

  function removeTopic(id: string) {
    setSelectedTopics((prev) => prev.filter((t) => t !== id));
  }

  function addCustomTopic() {
    const val = customInput.trim().toLowerCase();
    if (!val) return;
    if (!selectedTopics.includes(val)) {
      setSelectedTopics((prev) => [...prev, val]);
    }
    setCustomInput('');
  }

  function handleCustomKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      addCustomTopic();
    }
  }

  async function handleGenerate() {
    if (!selectedTopics.length) {
      setError('Selecione pelo menos um tópico');
      return;
    }

    setLoading(true);
    setError('');

    try {
      setStatus('Buscando vídeos e montando seu plano...');
      const res = await fetch('/api/plano', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topics: selectedTopics,
          hours_per_day: hoursPerDay,
          total_days: totalDays,
          instructions: instructions.trim() || undefined,
        }),
      });

      let data: { planId?: number; error?: string };
      try {
        data = await res.json();
      } catch {
        throw new Error('Serviço temporariamente indisponível. Tente novamente em alguns segundos.');
      }
      if (!res.ok) throw new Error(data.error ?? 'Erro ao gerar plano');

      router.push(`/plano?id=${data.planId}`);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao gerar plano');
    } finally {
      setLoading(false);
      setStatus('');
    }
  }

  const topicsSugeridosIds = [...TOPICS_SUGERIDOS, ...TOPICS_ENEM].map((t) => t.id);
  const customTopics = selectedTopics.filter((t) => !topicsSugeridosIds.includes(t));

  return (
    <div
      className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in"
      onClick={(e) => e.target === e.currentTarget && !loading && onClose()}
    >
      <div className="relative bg-zinc-900/95 border border-zinc-700/60 rounded-2xl w-full max-w-lg shadow-[0_0_80px_rgba(139,92,246,0.15)] max-h-[90vh] overflow-y-auto animate-slide-up">
        {/* Brilho superior */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-px bg-gradient-to-r from-transparent via-violet-500/50 to-transparent" />

        {/* Header do modal */}
        <div className="px-6 py-5 border-b border-zinc-800/80">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-500 to-violet-700 flex items-center justify-center shadow-[0_0_15px_rgba(139,92,246,0.5)]">
              ✨
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Criar Plano de Estudos</h2>
              <p className="text-xs text-zinc-500">Personalizado para seus objetivos</p>
            </div>
          </div>
        </div>

        <div className="px-6 py-5 flex flex-col gap-6">

          {/* Tópicos sugeridos */}
          <div>
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
              Tópicos de interesse
            </label>
            <div className="flex flex-wrap gap-2">
              {TOPICS_SUGERIDOS.map((topic) => (
                <button
                  key={topic.id}
                  onClick={() => toggleTopic(topic.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                    selectedTopics.includes(topic.id)
                      ? 'bg-violet-600 text-white shadow-[0_0_15px_rgba(139,92,246,0.4)] border border-violet-500'
                      : 'bg-zinc-800/80 text-zinc-400 hover:bg-zinc-700/80 hover:text-zinc-200 border border-zinc-700/50'
                  }`}
                >
                  {topic.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tópicos ENEM */}
          <div>
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
              ENEM / Vestibular
            </label>
            <div className="flex flex-wrap gap-2">
              {TOPICS_ENEM.map((topic) => (
                <button
                  key={topic.id}
                  onClick={() => toggleTopic(topic.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                    selectedTopics.includes(topic.id)
                      ? 'bg-emerald-600 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)] border border-emerald-500'
                      : 'bg-zinc-800/80 text-zinc-400 hover:bg-zinc-700/80 hover:text-zinc-200 border border-zinc-700/50'
                  }`}
                >
                  {topic.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tópico customizado */}
          <div>
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
              Tópico personalizado
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={customInput}
                onChange={(e) => setCustomInput(e.target.value)}
                onKeyDown={handleCustomKeyDown}
                placeholder="ex: machine learning, react native..."
                className="flex-1 bg-zinc-800/80 border border-zinc-700/60 rounded-xl px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30 transition-all"
              />
              <button
                onClick={addCustomTopic}
                disabled={!customInput.trim()}
                className="px-4 py-2 bg-zinc-700/80 hover:bg-zinc-600 disabled:opacity-30 text-white text-sm rounded-xl transition-all border border-zinc-600/50"
              >
                + Add
              </button>
            </div>

            {customTopics.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2.5">
                {customTopics.map((t) => (
                  <span
                    key={t}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-900/40 border border-indigo-700/60 text-indigo-300 rounded-full text-xs"
                  >
                    {t}
                    <button
                      onClick={() => removeTopic(t)}
                      className="hover:text-white transition-colors text-indigo-400 leading-none"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Resumo dos tópicos */}
          {selectedTopics.length > 0 && (
            <div className="bg-zinc-800/40 border border-zinc-700/40 rounded-xl px-4 py-3">
              <p className="text-xs text-zinc-500 mb-2 font-medium">
                {selectedTopics.length} tópico{selectedTopics.length > 1 ? 's' : ''} selecionado{selectedTopics.length > 1 ? 's' : ''}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {selectedTopics.map((t) => (
                  <span key={t} className="flex items-center gap-1 text-xs bg-zinc-700/60 text-zinc-300 px-2 py-0.5 rounded-full border border-zinc-600/40">
                    {t}
                    <button onClick={() => removeTopic(t)} className="hover:text-red-400 transition-colors text-zinc-500">×</button>
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Instruções */}
          <div>
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
              Instruções adicionais{' '}
              <span className="text-zinc-700 font-normal normal-case">(opcional)</span>
            </label>
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Ex: Foque em AWS Solutions Architect. / Pro ENEM, priorize matemática..."
              rows={3}
              className="w-full bg-zinc-800/80 border border-zinc-700/60 rounded-xl px-3 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30 transition-all resize-none"
            />
          </div>

          {/* Horas por dia */}
          <div>
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
              Horas disponíveis por dia:{' '}
              <span className="text-violet-400 font-bold text-sm normal-case">{hoursPerDay}h</span>
            </label>
            <input
              type="range"
              min={1}
              max={8}
              step={0.5}
              value={hoursPerDay}
              onChange={(e) => setHoursPerDay(parseFloat(e.target.value))}
              className="w-full accent-violet-500 h-1.5"
            />
            <div className="flex justify-between text-xs text-zinc-700 mt-1.5">
              <span>1h</span>
              <span>8h</span>
            </div>
          </div>

          {/* Dias */}
          <div>
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">
              Duração do plano
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min={1}
                max={60}
                value={totalDays}
                onChange={(e) => setTotalDays(Math.max(1, Math.min(60, parseInt(e.target.value) || 1)))}
                className="w-24 bg-zinc-800/80 border border-zinc-700/60 rounded-xl px-3 py-2 text-white text-center focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30 transition-all"
              />
              <span className="text-zinc-500 text-sm">dias</span>
              <span className="text-xs text-zinc-600 bg-zinc-800/50 px-3 py-1.5 rounded-lg border border-zinc-700/40">
                ≈ {Math.round(hoursPerDay * totalDays)}h no total
              </span>
            </div>
          </div>

          {/* Erro */}
          {error && (
            <div className="text-red-300 text-sm bg-red-950/50 border border-red-800/60 rounded-xl px-4 py-3 flex items-center gap-2">
              <span>⚠️</span> {error}
            </div>
          )}

          {/* Status loading */}
          {status && (
            <div className="text-violet-300 text-sm bg-violet-950/40 border border-violet-800/50 rounded-xl px-4 py-3 flex items-center gap-3">
              <span className="inline-block w-4 h-4 border-2 border-violet-600 border-t-violet-300 rounded-full animate-spin flex-shrink-0" />
              {status}
            </div>
          )}

          {/* Botões */}
          <div className="flex gap-3 justify-end pt-1">
            <button
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-zinc-500 hover:text-zinc-300 transition-colors disabled:opacity-40 text-sm rounded-xl hover:bg-white/[0.05]"
            >
              Cancelar
            </button>
            <button
              onClick={handleGenerate}
              disabled={loading || !selectedTopics.length}
              className="px-6 py-2.5 bg-gradient-to-r from-violet-600 to-violet-500 hover:from-violet-500 hover:to-violet-400 disabled:from-zinc-700 disabled:to-zinc-700 disabled:text-zinc-500 text-white rounded-xl transition-all duration-300 font-semibold text-sm shadow-[0_0_20px_rgba(139,92,246,0.35)] hover:shadow-[0_0_30px_rgba(139,92,246,0.55)] disabled:shadow-none flex items-center gap-2"
            >
              {loading ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Gerando...
                </>
              ) : (
                <>✨ Gerar Plano </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
