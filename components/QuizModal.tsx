'use client';

import { useEffect, useState } from 'react';
import type { QuizQuestion } from '@/app/api/quiz/route';

interface Props {
  planId: number;
  day: number;
  dayTheme?: string;
  onClose: () => void;
}

type Phase = 'loading' | 'error' | 'question' | 'answer' | 'result';

export default function QuizModal({ planId, day, dayTheme, onClose }: Props) {
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [phase, setPhase] = useState<Phase>('loading');
  const [error, setError] = useState('');
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);

  useEffect(() => { load(); }, []);

  async function load() {
    setPhase('loading');
    try {
      const res = await fetch('/api/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId, day }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Erro ao carregar quiz.'); setPhase('error'); return; }
      setQuestions(data.questions);
      setCurrent(0);
      setAnswers([]);
      setSelected(null);
      setPhase('question');
    } catch {
      setError('Erro de conexão.');
      setPhase('error');
    }
  }

  function handleSelect(idx: number) {
    if (phase !== 'question') return;
    setSelected(idx);
    setPhase('answer');
    setAnswers(prev => [...prev, idx]);
  }

  function handleNext() {
    const next = current + 1;
    if (next >= questions.length) {
      setPhase('result');
    } else {
      setCurrent(next);
      setSelected(null);
      setPhase('question');
    }
  }

  const score = answers.filter((a, i) => a === questions[i]?.correct).length;
  const q = questions[current];
  const percent = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0;

  function ScoreLabel() {
    if (percent >= 80) return <span className="text-emerald-400">Excelente!</span>;
    if (percent >= 60) return <span className="text-amber-400">Bom trabalho!</span>;
    return <span className="text-rose-400">Continue praticando!</span>;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" />

      <div
        className="relative bg-zinc-900 border border-zinc-700/60 rounded-3xl w-full max-w-lg shadow-[0_0_80px_rgba(139,92,246,0.2)] animate-slide-up flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Top glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-px bg-gradient-to-r from-transparent via-violet-500/60 to-transparent" />

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center">
              <span className="text-base">🧪</span>
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Quiz — Dia {day}</h2>
              {dayTheme && <p className="text-xs text-zinc-500 mt-0.5 truncate max-w-[220px]">{dayTheme}</p>}
            </div>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-all">
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 px-6 py-6">

          {/* Loading */}
          {phase === 'loading' && (
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="relative w-14 h-14">
                <div className="absolute inset-0 rounded-full border-2 border-violet-900/50" />
                <div className="absolute inset-0 rounded-full border-2 border-t-violet-400 border-r-transparent border-b-transparent border-l-transparent animate-spin" />
                <div className="absolute inset-3 rounded-full bg-violet-600/10 flex items-center justify-center text-lg">🧪</div>
              </div>
              <div className="text-center">
                <p className="text-zinc-200 text-sm font-medium">Gerando quiz...</p>
                <p className="text-zinc-600 text-xs mt-1">Isso pode levar alguns segundos</p>
              </div>
            </div>
          )}

          {/* Error */}
          {phase === 'error' && (
            <div className="flex flex-col items-center gap-4 py-8 text-center">
              <p className="text-red-400 text-sm">{error}</p>
              <button onClick={load}
                className="px-4 py-2 bg-violet-600/20 hover:bg-violet-600/30 border border-violet-500/40 text-violet-300 text-sm rounded-xl transition-all">
                Tentar novamente
              </button>
            </div>
          )}

          {/* Question / Answer */}
          {(phase === 'question' || phase === 'answer') && q && (
            <div className="flex flex-col gap-5">
              {/* Progress */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-violet-600 to-violet-400 rounded-full transition-all duration-500"
                    style={{ width: `${((current) / questions.length) * 100}%` }}
                  />
                </div>
                <span className="text-xs text-zinc-500 flex-shrink-0">{current + 1}/{questions.length}</span>
              </div>

              {/* Question */}
              <div className="bg-zinc-800/40 border border-zinc-700/50 rounded-2xl px-5 py-4">
                <p className="text-white font-semibold text-sm leading-relaxed">{q.question}</p>
              </div>

              {/* Options */}
              <div className="flex flex-col gap-2.5">
                {q.options.map((opt, i) => {
                  const isSelected = selected === i;
                  const isCorrect = i === q.correct;
                  let style = 'bg-zinc-800/60 border-zinc-700/60 text-zinc-300 hover:bg-zinc-700/60 hover:border-zinc-600 hover:text-white cursor-pointer';
                  if (phase === 'answer') {
                    if (isCorrect) style = 'bg-emerald-900/40 border-emerald-500/60 text-emerald-300 cursor-default';
                    else if (isSelected) style = 'bg-rose-900/40 border-rose-500/60 text-rose-300 cursor-default';
                    else style = 'bg-zinc-800/30 border-zinc-700/30 text-zinc-500 cursor-default opacity-50';
                  }
                  const letter = ['A', 'B', 'C', 'D'][i];
                  return (
                    <button
                      key={i}
                      onClick={() => handleSelect(i)}
                      disabled={phase === 'answer'}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all duration-200 ${style}`}
                    >
                      <span className={`flex-shrink-0 w-6 h-6 rounded-lg border flex items-center justify-center text-xs font-bold transition-all ${
                        phase === 'answer' && isCorrect ? 'bg-emerald-600 border-emerald-500 text-white' :
                        phase === 'answer' && isSelected ? 'bg-rose-600 border-rose-500 text-white' :
                        'border-zinc-600 text-zinc-500'
                      }`}>{letter}</span>
                      <span className="text-sm leading-snug">{opt}</span>
                      {phase === 'answer' && isCorrect && <span className="ml-auto text-emerald-400 text-base flex-shrink-0">✓</span>}
                      {phase === 'answer' && isSelected && !isCorrect && <span className="ml-auto text-rose-400 text-base flex-shrink-0">✕</span>}
                    </button>
                  );
                })}
              </div>

              {/* Explanation */}
              {phase === 'answer' && (
                <div className={`rounded-xl px-4 py-3 border text-xs leading-relaxed animate-slide-up ${
                  selected === q.correct
                    ? 'bg-emerald-900/20 border-emerald-700/40 text-emerald-300'
                    : 'bg-amber-900/20 border-amber-700/40 text-amber-300'
                }`}>
                  <span className="font-semibold block mb-1">
                    {selected === q.correct ? '✓ Correto! ' : '✕ Incorreto. '}
                  </span>
                  {q.explanation}
                </div>
              )}
            </div>
          )}

          {/* Result */}
          {phase === 'result' && (
            <div className="flex flex-col items-center gap-6 py-4">
              {/* Score ring */}
              <div className="relative">
                <svg width="120" height="120" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r="50" fill="none" stroke="#27272a" strokeWidth="10" />
                  <circle cx="60" cy="60" r="50" fill="none"
                    stroke={percent >= 80 ? '#10b981' : percent >= 60 ? '#f59e0b' : '#ef4444'}
                    strokeWidth="10" strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 50}`}
                    strokeDashoffset={`${2 * Math.PI * 50 * (1 - percent / 100)}`}
                    transform="rotate(-90 60 60)"
                    className="transition-all duration-1000"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-bold text-white">{percent}%</span>
                  <span className="text-xs text-zinc-500">{score}/{questions.length}</span>
                </div>
              </div>

              <div className="text-center">
                <p className="text-lg font-bold"><ScoreLabel /></p>
                <p className="text-zinc-500 text-sm mt-1">
                  Você acertou {score} de {questions.length} perguntas
                </p>
              </div>

              {/* Answer review */}
              <div className="w-full flex flex-col gap-2">
                {questions.map((q2, i) => {
                  const correct = answers[i] === q2.correct;
                  return (
                    <div key={i} className={`flex items-start gap-2.5 px-3 py-2.5 rounded-xl border text-xs ${
                      correct ? 'bg-emerald-900/20 border-emerald-700/30' : 'bg-rose-900/20 border-rose-700/30'
                    }`}>
                      <span className={`flex-shrink-0 mt-0.5 ${correct ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {correct ? '✓' : '✕'}
                      </span>
                      <span className="text-zinc-300 leading-relaxed">{q2.question}</span>
                    </div>
                  );
                })}
              </div>

              <div className="flex gap-3 w-full">
                <button onClick={load}
                  className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 text-sm rounded-xl transition-all">
                  Refazer
                </button>
                <button onClick={onClose}
                  className="flex-1 py-2.5 bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold rounded-xl transition-all shadow-[0_0_20px_rgba(139,92,246,0.3)]">
                  Concluir
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Bottom progress dots */}
        {(phase === 'question' || phase === 'answer') && questions.length > 0 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-800">
            <div className="flex gap-1.5">
              {questions.map((_, i) => (
                <div key={i} className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  i < answers.length
                    ? answers[i] === questions[i].correct ? 'bg-emerald-500' : 'bg-rose-500'
                    : i === current ? 'bg-violet-400 scale-125' : 'bg-zinc-700'
                }`} />
              ))}
            </div>
            {phase === 'answer' && (
              <button onClick={handleNext}
                className="px-5 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold rounded-xl transition-all shadow-[0_0_15px_rgba(139,92,246,0.3)] flex items-center gap-2">
                {current + 1 >= questions.length ? 'Ver resultado' : 'Próxima'}
                <span>→</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
