'use client';

import { useEffect, useRef, useState } from 'react';

interface Props {
  planId: number;
  planTitle: string;
  day?: number;
  onClose: () => void;
}

export default function MindMapModal({ planId, planTitle, day, onClose }: Props) {
  const [mermaid, setMermaid] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rendered, setRendered] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    generate();
  }, []);

  async function generate() {
    setLoading(true);
    setError('');
    setRendered(false);
    try {
      const res = await fetch('/api/mindmap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId, day }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Erro ao gerar mapa.'); return; }
      setMermaid(data.mermaid);
    } catch {
      setError('Erro de conexão.');
    } finally {
      setLoading(false);
    }
  }

  // Renderiza o Mermaid quando o código chega
  useEffect(() => {
    if (!mermaid || !containerRef.current) return;

    async function render() {
      try {
        const mermaidLib = (await import('mermaid')).default;
        mermaidLib.initialize({
          startOnLoad: false,
          theme: 'dark',
          mindmap: { padding: 20 },
          themeVariables: {
            darkMode: true,
            background: '#18181b',
            mainBkg: '#18181b',
            nodeBorder: '#7c3aed',
            lineColor: '#7c3aed',
            primaryColor: '#27272a',
            primaryTextColor: '#e4e4e7',
            secondaryColor: '#3f3f46',
            tertiaryColor: '#52525b',
          },
        });

        const id = `mindmap-${Date.now()}`;
        const { svg } = await mermaidLib.render(id, mermaid);
        if (containerRef.current) {
          containerRef.current.innerHTML = svg;
          setRendered(true);
        }
      } catch (e) {
        console.error('Mermaid render error:', e);
        setError('Erro ao renderizar o mapa. Tente gerar novamente.');
      }
    }

    render();
  }, [mermaid]);

  function downloadSVG() {
    const svgEl = containerRef.current?.querySelector('svg');
    if (!svgEl) return;
    const blob = new Blob([svgEl.outerHTML], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mapa-mental-${day ? `dia-${day}` : 'completo'}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function downloadPNG() {
    const svgEl = containerRef.current?.querySelector('svg');
    if (!svgEl) return;

    const svgData = new XMLSerializer().serializeToString(svgEl);
    const canvas = document.createElement('canvas');
    const img = new Image();

    const svgWidth = svgEl.viewBox?.baseVal?.width || svgEl.clientWidth || 1200;
    const svgHeight = svgEl.viewBox?.baseVal?.height || svgEl.clientHeight || 800;
    canvas.width = svgWidth * 2;
    canvas.height = svgHeight * 2;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(2, 2);
    ctx.fillStyle = '#18181b';
    ctx.fillRect(0, 0, svgWidth, svgHeight);

    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    img.onload = () => {
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      const a = document.createElement('a');
      a.download = `mapa-mental-${day ? `dia-${day}` : 'completo'}.png`;
      a.href = canvas.toDataURL('image/png');
      a.click();
    };
    img.src = url;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      <div
        className="relative bg-zinc-900 border border-zinc-700/50 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-[0_0_80px_rgba(139,92,246,0.2)] animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-800">
          <div>
            <h2 className="text-base font-bold text-white">
              {day ? `Mapa Mental — Dia ${day}` : 'Mapa Mental — Plano Completo'}
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">{planTitle}</p>
          </div>

          <div className="flex items-center gap-2">
            {rendered && (
              <>
                <button
                  onClick={downloadSVG}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 text-xs rounded-lg transition-all"
                >
                  ⬇ SVG
                </button>
                <button
                  onClick={downloadPNG}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600/20 hover:bg-violet-600/30 border border-violet-500/40 text-violet-300 text-xs rounded-lg transition-all"
                >
                  ⬇ PNG
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 rounded-lg transition-all"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Conteúdo */}
        <div className="flex-1 overflow-auto p-6 flex items-center justify-center min-h-0">
          {loading && (
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="w-16 h-16 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                <span className="w-6 h-6 border-2 border-violet-700 border-t-violet-400 rounded-full animate-spin" />
              </div>
              <div>
                <p className="text-zinc-300 text-sm font-medium">Gerando mapa mental com IA...</p>
                <p className="text-zinc-600 text-xs mt-1">Isso pode levar alguns segundos</p>
              </div>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="text-4xl">⚠️</div>
              <p className="text-red-400 text-sm">{error}</p>
              <button
                onClick={generate}
                className="px-4 py-2 bg-violet-600/20 hover:bg-violet-600/30 border border-violet-500/40 text-violet-300 text-sm rounded-xl transition-all"
              >
                Tentar novamente
              </button>
            </div>
          )}

          {/* Container do SVG renderizado */}
          <div
            ref={containerRef}
            className={`w-full [&_svg]:w-full [&_svg]:h-auto [&_svg]:max-h-[60vh] ${loading || error ? 'hidden' : ''}`}
          />
        </div>

        {rendered && (
          <div className="px-6 py-3 border-t border-zinc-800 text-center">
            <p className="text-xs text-zinc-700">
              Mapa gerado por IA · Clique e arraste para explorar
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
