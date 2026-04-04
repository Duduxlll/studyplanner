'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

// ── Tipos ──────────────────────────────────────────────────────────────────────
interface MindNode { label: string; children?: MindNode[] }

interface Placed {
  id: string; label: string;
  x: number; y: number;
  level: number;
  fill: string; stroke: string; textColor: string;
  children: Placed[];
  parentX: number | null; parentY: number | null;
}

// ── Paleta de cores por branch ─────────────────────────────────────────────────
const PALETTE = [
  { fill: '#3b0764', stroke: '#7c3aed', textColor: '#ede9fe' }, // violet
  { fill: '#1e3a8a', stroke: '#3b82f6', textColor: '#dbeafe' }, // blue
  { fill: '#064e3b', stroke: '#10b981', textColor: '#d1fae5' }, // emerald
  { fill: '#7f1d1d', stroke: '#ef4444', textColor: '#fee2e2' }, // red
  { fill: '#78350f', stroke: '#f59e0b', textColor: '#fef3c7' }, // amber
  { fill: '#0c4a6e', stroke: '#06b6d4', textColor: '#cffafe' }, // cyan
  { fill: '#4a1d96', stroke: '#a855f7', textColor: '#f3e8ff' }, // purple
  { fill: '#134e4a', stroke: '#14b8a6', textColor: '#ccfbf1' }, // teal
];
const ROOT_COLOR = { fill: '#1a0533', stroke: '#8b5cf6', textColor: '#f5f3ff' };

// ── Layout radial ──────────────────────────────────────────────────────────────
const RADII = [0, 195, 370, 510];

function countLeaves(n: MindNode): number {
  if (!n.children?.length) return 1;
  return n.children.reduce((s, c) => s + countLeaves(c), 0);
}

let _id = 0;
function placeNode(
  node: MindNode, level: number,
  a0: number, a1: number,
  colorIdx: number,
  px: number | null, py: number | null
): Placed {
  const mid = (a0 + a1) / 2;
  const r = RADII[Math.min(level, RADII.length - 1)];
  const x = level === 0 ? 0 : Math.cos(mid) * r;
  const y = level === 0 ? 0 : Math.sin(mid) * r;
  const col = level === 0 ? ROOT_COLOR : PALETTE[colorIdx % PALETTE.length];

  const ch = node.children ?? [];
  const totalL = ch.reduce((s, c) => s + countLeaves(c), 0) || 1;
  let a = a0;
  const children: Placed[] = ch.map((c, i) => {
    const span = (a1 - a0) * (countLeaves(c) / totalL);
    const childCI = level === 0 ? i : colorIdx;
    const child = placeNode(c, level + 1, a, a + span, childCI, x, y);
    a += span;
    return child;
  });

  return { id: `n${_id++}`, label: node.label.slice(0, 26), x, y, level, ...col, children, parentX: px, parentY: py };
}

function flatten(n: Placed): Placed[] {
  return [n, ...n.children.flatMap(flatten)];
}

function buildLayout(root: MindNode): Placed {
  _id = 0;
  return placeNode(root, 0, -Math.PI / 2, Math.PI * 1.5, 0, null, null);
}

// ── Geometria ──────────────────────────────────────────────────────────────────
function nodeSize(label: string, level: number) {
  const w = level === 0 ? 170 : Math.max(88, label.length * (level === 1 ? 7.8 : 7) + 22);
  const h = level === 0 ? 54 : level === 1 ? 40 : 32;
  const rx = level === 0 ? 27 : level === 1 ? 12 : 8;
  return { w, h, rx };
}

function cubicPath(x1: number, y1: number, x2: number, y2: number) {
  const cx = (x1 + x2) / 2;
  return `M${x1},${y1} C${cx},${y1} ${cx},${y2} ${x2},${y2}`;
}

// ── Componentes SVG ────────────────────────────────────────────────────────────
function Edge({ node }: { node: Placed }) {
  if (node.parentX == null || node.parentY == null) return null;
  return (
    <path
      d={cubicPath(node.parentX, node.parentY, node.x, node.y)}
      stroke={node.stroke}
      strokeWidth={node.level === 1 ? 2 : 1.5}
      strokeOpacity={0.55}
      fill="none"
      strokeLinecap="round"
    />
  );
}

function Node({ node }: { node: Placed }) {
  const { w, h, rx } = nodeSize(node.label, node.level);
  const fontSize = node.level === 0 ? 15 : node.level === 1 ? 12.5 : 11;
  const fontWeight = node.level === 0 ? 700 : node.level === 1 ? 600 : 400;

  // Split label into up to 2 lines
  const words = node.label.split(' ');
  let line1 = '', line2 = '';
  for (const w2 of words) {
    if ((line1 + ' ' + w2).trim().length <= 14) line1 = (line1 + ' ' + w2).trim();
    else line2 = (line2 + ' ' + w2).trim();
  }
  const twoLine = line2.length > 0;

  return (
    <g>
      {/* Drop shadow */}
      <rect x={node.x - w / 2 + 2} y={node.y - h / 2 + 3} width={w} height={h} rx={rx}
        fill="rgba(0,0,0,0.45)" />
      {/* Background */}
      <rect x={node.x - w / 2} y={node.y - h / 2} width={w} height={h} rx={rx}
        fill={node.fill} stroke={node.stroke} strokeWidth={node.level === 0 ? 2.5 : 1.5} />
      {/* Inner highlight */}
      <rect x={node.x - w / 2 + 1} y={node.y - h / 2 + 1} width={w - 2} height={h / 2} rx={rx}
        fill="rgba(255,255,255,0.06)" />
      {/* Text */}
      {twoLine ? (
        <>
          <text x={node.x} y={node.y - 7} textAnchor="middle" dominantBaseline="middle"
            fontSize={fontSize} fontWeight={fontWeight} fill={node.textColor}
            fontFamily="Inter, ui-sans-serif, system-ui, sans-serif" letterSpacing="-0.2">
            {line1}
          </text>
          <text x={node.x} y={node.y + 8} textAnchor="middle" dominantBaseline="middle"
            fontSize={fontSize} fontWeight={fontWeight} fill={node.textColor}
            fontFamily="Inter, ui-sans-serif, system-ui, sans-serif" letterSpacing="-0.2">
            {line2}
          </text>
        </>
      ) : (
        <text x={node.x} y={node.y} textAnchor="middle" dominantBaseline="middle"
          fontSize={fontSize} fontWeight={fontWeight} fill={node.textColor}
          fontFamily="Inter, ui-sans-serif, system-ui, sans-serif" letterSpacing="-0.2">
          {node.label}
        </text>
      )}
      {/* Root glow ring */}
      {node.level === 0 && (
        <rect x={node.x - w / 2 - 4} y={node.y - h / 2 - 4} width={w + 8} height={h + 8} rx={rx + 4}
          fill="none" stroke="#7c3aed" strokeWidth={1} strokeOpacity={0.35} />
      )}
    </g>
  );
}

// ── Modal ──────────────────────────────────────────────────────────────────────
interface Props {
  planId: number;
  planTitle: string;
  day?: number;
  onClose: () => void;
}

export default function MindMapModal({ planId, planTitle, day, onClose }: Props) {
  const [nodes, setNodes] = useState<MindNode | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const svgRef = useRef<SVGSVGElement>(null);

  const generate = useCallback(async () => {
    setLoading(true);
    setError('');
    setNodes(null);
    try {
      const res = await fetch('/api/mindmap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId, day }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Erro ao gerar mapa.'); return; }
      setNodes(data.nodes);
    } catch {
      setError('Erro de conexão.');
    } finally {
      setLoading(false);
    }
  }, [planId, day]);

  useEffect(() => { generate(); }, [generate]);

  // ── Renderização ─────────────────────────────────────────────────────────────
  const placed = nodes ? buildLayout(nodes) : null;
  const allNodes = placed ? flatten(placed) : [];

  // ViewBox automático com padding
  const pad = 80;
  let minX = -200, maxX = 200, minY = -200, maxY = 200;
  if (allNodes.length) {
    minX = Math.min(...allNodes.map(n => n.x - 100));
    maxX = Math.max(...allNodes.map(n => n.x + 100));
    minY = Math.min(...allNodes.map(n => n.y - 40));
    maxY = Math.max(...allNodes.map(n => n.y + 40));
  }
  const vbX = minX - pad, vbY = minY - pad;
  const vbW = maxX - minX + pad * 2;
  const vbH = maxY - minY + pad * 2;

  // ── Downloads ────────────────────────────────────────────────────────────────
  function downloadSVG() {
    const el = svgRef.current;
    if (!el) return;
    const blob = new Blob([el.outerHTML], { type: 'image/svg+xml' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `mapa-${day ? `dia-${day}` : 'completo'}.svg`;
    a.click();
  }

  function downloadPNG() {
    const el = svgRef.current;
    if (!el) return;
    const scale = 2;
    const canvas = document.createElement('canvas');
    canvas.width = vbW * scale;
    canvas.height = vbH * scale;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#09090b';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    const img = new Image();
    const svgData = `<svg xmlns="http://www.w3.org/2000/svg" width="${vbW * scale}" height="${vbH * scale}" viewBox="${vbX} ${vbY} ${vbW} ${vbH}">${el.innerHTML}</svg>`;
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    img.onload = () => {
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(img.src);
      const a = document.createElement('a');
      a.download = `mapa-${day ? `dia-${day}` : 'completo'}.png`;
      a.href = canvas.toDataURL('image/png');
      a.click();
    };
    img.src = URL.createObjectURL(blob);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" />

      <div
        className="relative bg-[#09090b] border border-zinc-800 rounded-3xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-[0_0_120px_rgba(124,58,237,0.18)] animate-slide-up"
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/80">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center text-base">
              🧠
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">
                {day ? `Mapa Mental — Dia ${day}` : 'Mapa Mental — Plano Completo'}
              </h2>
              <p className="text-xs text-zinc-500 mt-0.5 max-w-xs truncate">{planTitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {placed && (
              <>
                <button onClick={downloadSVG}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700/60 text-zinc-300 text-xs rounded-lg transition-all">
                  ↓ SVG
                </button>
                <button onClick={downloadPNG}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600/20 hover:bg-violet-600/30 border border-violet-500/40 text-violet-300 text-xs rounded-lg transition-all">
                  ↓ PNG
                </button>
              </>
            )}
            <button onClick={onClose}
              className="w-8 h-8 flex items-center justify-center text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 rounded-lg transition-all text-lg leading-none">
              ✕
            </button>
          </div>
        </div>

        {/* ── Conteúdo ── */}
        <div className="flex-1 overflow-auto flex items-center justify-center min-h-0 p-4">
          {loading && (
            <div className="flex flex-col items-center gap-4">
              <div className="relative w-16 h-16">
                <div className="absolute inset-0 rounded-full border-2 border-violet-800/40" />
                <div className="absolute inset-0 rounded-full border-2 border-t-violet-400 border-r-transparent border-b-transparent border-l-transparent animate-spin" />
                <div className="absolute inset-3 rounded-full bg-violet-600/10 flex items-center justify-center text-xl">🧠</div>
              </div>
              <div className="text-center">
                <p className="text-zinc-200 text-sm font-medium">Gerando mapa mental...</p>
                <p className="text-zinc-600 text-xs mt-1">Organizando os conceitos...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center gap-4 text-center">
              <p className="text-red-400 text-sm">{error}</p>
              <button onClick={generate}
                className="px-4 py-2 bg-violet-600/20 hover:bg-violet-600/30 border border-violet-500/40 text-violet-300 text-sm rounded-xl transition-all">
                Tentar novamente
              </button>
            </div>
          )}

          {placed && (
            <svg
              ref={svgRef}
              viewBox={`${vbX} ${vbY} ${vbW} ${vbH}`}
              className="w-full h-full"
              style={{ maxHeight: 'calc(92vh - 100px)' }}
            >
              <defs>
                {/* Subtle radial gradient for background glow */}
                <radialGradient id="bgGlow" cx="50%" cy="50%" r="50%">
                  <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.06" />
                  <stop offset="100%" stopColor="#09090b" stopOpacity="0" />
                </radialGradient>
              </defs>

              {/* Background glow */}
              <ellipse cx="0" cy="0" rx={vbW * 0.6} ry={vbH * 0.6} fill="url(#bgGlow)" />

              {/* Edges (rendered first, behind nodes) */}
              {allNodes.map(n => <Edge key={`e-${n.id}`} node={n} />)}

              {/* Nodes */}
              {allNodes.map(n => <Node key={n.id} node={n} />)}
            </svg>
          )}
        </div>

        {placed && (
          <div className="px-6 py-2.5 border-t border-zinc-800/60 flex items-center justify-between">
            <p className="text-xs text-zinc-700">{allNodes.length} conceitos</p>
            <div className="flex items-center gap-2">
              {[...new Set(allNodes.filter(n => n.level === 1).map(n => n.stroke))].slice(0, 6).map((c, i) => (
                <span key={i} className="w-2 h-2 rounded-full" style={{ backgroundColor: c }} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
