import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { ensureInit } from '@/lib/db';
import Anthropic from '@anthropic-ai/sdk';

export const runtime = 'nodejs';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { planId, day } = await req.json() as { planId: number; day?: number };

  const db = await ensureInit();

  // Verifica que o plano pertence ao usuário
  const planResult = await db.execute({
    sql: 'SELECT id, title, topics FROM plans WHERE id = ? AND user_id = ?',
    args: [planId, session.user.id],
  });

  if (planResult.rows.length === 0) {
    return NextResponse.json({ error: 'Plano não encontrado.' }, { status: 404 });
  }

  const plan = planResult.rows[0] as unknown as { id: number; title: string; topics: string };
  const topics: string[] = JSON.parse(plan.topics);

  // Busca vídeos — do dia inteiro ou de um dia específico
  const videosSql = day != null
    ? 'SELECT title, channel_name, day, day_theme FROM plan_videos WHERE plan_id = ? AND day = ? ORDER BY order_in_day'
    : 'SELECT title, channel_name, day, day_theme FROM plan_videos WHERE plan_id = ? ORDER BY day, order_in_day';

  const args = day != null ? [planId, day] : [planId];
  const videosResult = await db.execute({ sql: videosSql, args });

  type VideoRow = { title: string; channel_name: string; day: number; day_theme: string | null };
  const videos = videosResult.rows as unknown as VideoRow[];

  if (videos.length === 0) {
    return NextResponse.json({ error: 'Nenhum vídeo encontrado.' }, { status: 400 });
  }

  // Monta prompt
  const scope = day != null ? `do Dia ${day}` : 'completo';
  const theme = day != null && videos[0]?.day_theme ? `\nTema do dia: ${videos[0].day_theme}` : '';

  const videoList = day != null
    ? videos.map(v => `- ${v.title} (${v.channel_name})`).join('\n')
    : Object.entries(
        videos.reduce<Record<number, VideoRow[]>>((acc, v) => {
          (acc[v.day] = acc[v.day] ?? []).push(v);
          return acc;
        }, {})
      ).map(([d, vs]) => {
        const th = vs[0].day_theme ? ` — ${vs[0].day_theme}` : '';
        return `Dia ${d}${th}:\n${vs.map(v => `  - ${v.title}`).join('\n')}`;
      }).join('\n\n');

  const prompt = `Você é um especialista em criar mapas mentais educacionais.

Crie um mapa mental ${scope} do plano de estudo "${plan.title}" (tópicos: ${topics.join(', ')}).${theme}

Vídeos/conteúdos:
${videoList}

REGRAS CRÍTICAS do Mermaid mindmap:
- Use EXATAMENTE a sintaxe: mindmap
- Indentação com 2 espaços por nível
- Nó raiz: sem colchetes, apenas o texto
- Nós filhos: indentados 2 espaços
- Netos: indentados 4 espaços
- Use apenas letras, números e espaços nos nós (sem caracteres especiais como /, :, ", ', etc.)
- Máximo 3 níveis de profundidade
- Máximo 5 filhos por nó
- Texto dos nós: máximo 40 caracteres

Exemplo de formato correto:
mindmap
  root((Título do Plano))
    Categoria 1
      Item A
      Item B
    Categoria 2
      Item C
      Item D

Retorne APENAS o código Mermaid, sem explicações, sem blocos de código markdown, sem nada mais.`;

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }],
  });

  const text = message.content[0].type === 'text' ? message.content[0].text.trim() : '';

  // Remove blocos de código se vier com ```
  const cleaned = text.replace(/^```(?:mermaid)?\n?/, '').replace(/\n?```$/, '').trim();

  return NextResponse.json({ mermaid: cleaned });
}
