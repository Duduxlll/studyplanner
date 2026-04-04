import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { ensureInit } from '@/lib/db';
import Anthropic from '@anthropic-ai/sdk';

export const runtime = 'nodejs';
export const maxDuration = 60;

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { planId, day } = await req.json() as { planId: number; day?: number };

  const db = await ensureInit();

  const planResult = await db.execute({
    sql: 'SELECT id, title, topics FROM plans WHERE id = ? AND user_id = ?',
    args: [planId, session.user.id],
  });
  if (planResult.rows.length === 0) {
    return NextResponse.json({ error: 'Plano não encontrado.' }, { status: 404 });
  }

  const plan = planResult.rows[0] as unknown as { id: number; title: string; topics: string };
  const topics: string[] = JSON.parse(plan.topics);

  const videosSql = day != null
    ? 'SELECT title, channel_name, day, day_theme FROM plan_videos WHERE plan_id = ? AND day = ? ORDER BY order_in_day'
    : 'SELECT title, channel_name, day, day_theme FROM plan_videos WHERE plan_id = ? ORDER BY day, order_in_day';

  const videosResult = await db.execute({ sql: videosSql, args: day != null ? [planId, day] : [planId] });
  type VideoRow = { title: string; channel_name: string; day: number; day_theme: string | null };
  const videos = videosResult.rows as unknown as VideoRow[];

  if (videos.length === 0) {
    return NextResponse.json({ error: 'Nenhum vídeo encontrado.' }, { status: 400 });
  }

  // ── Prompt específico por modo ──────────────────────────────────────────────
  let prompt: string;

  if (day != null) {
    const theme = videos[0]?.day_theme ?? `Dia ${day}`;
    const videoList = videos.map(v => `- "${v.title}" | Canal: ${v.channel_name}`).join('\n');

    prompt = `Você é um especialista em mapas mentais educacionais.

Crie um mapa mental para o Dia ${day} de um plano de estudos.
Tema do dia: "${theme}"
Tópicos gerais: ${topics.join(', ')}

Vídeos do dia:
${videoList}

REGRAS:
- Nó raiz: tema do dia (máx 22 caracteres)
- Nível 1 (3-6 filhos): agrupamentos lógicos dos vídeos (ex: canal, subtópico, área)
- Nível 2 (2-4 filhos cada): conceitos-chave ou títulos resumidos dos vídeos
- Nível 3 (opcional, 1-2 filhos): detalhes muito específicos apenas se necessário
- Todos os labels: máx 24 caracteres, sem caracteres especiais (/,:,",',(,))
- Seja educativo: mostre a progressão e relação entre os conteúdos

Retorne APENAS o JSON a seguir (sem markdown, sem explicações):
{
  "label": "tema do dia",
  "children": [
    {
      "label": "grupo 1",
      "children": [
        { "label": "conceito a" },
        { "label": "conceito b" }
      ]
    }
  ]
}`;
  } else {
    // Complete plan view: group by phase/progression
    type DayGroup = { theme: string | null; titles: string[] };
    const byDay = videos.reduce<Record<number, DayGroup>>((acc, v) => {
      if (!acc[v.day]) acc[v.day] = { theme: v.day_theme, titles: [] };
      acc[v.day].titles.push(v.title);
      return acc;
    }, {});

    const days = Object.entries(byDay);
    const totalDays = days.length;
    const phase1End = Math.ceil(totalDays * 0.35);
    const phase2End = Math.ceil(totalDays * 0.7);

    const phases = [
      { label: 'Iniciante', days: days.slice(0, phase1End) },
      { label: 'Intermediário', days: days.slice(phase1End, phase2End) },
      { label: 'Avançado', days: days.slice(phase2End) },
    ].filter(p => p.days.length > 0);

    const phaseDescriptions = phases.map(p =>
      `${p.label} (Dias ${p.days[0][0]}–${p.days[p.days.length - 1][0]}):\n` +
      p.days.slice(0, 4).map(([d, g]) => `  Dia ${d}: ${g.theme ?? 'Sem tema'}`).join('\n')
    ).join('\n\n');

    prompt = `Você é um especialista em mapas mentais educacionais.

Crie um mapa mental completo para o plano de estudos de ${totalDays} dias.
Tópicos: ${topics.join(', ')}

Estrutura do plano por fases:
${phaseDescriptions}

REGRAS:
- Nó raiz: nome curto do plano (máx 22 caracteres)
- Nível 1 (2-4 filhos): fases do aprendizado (Iniciante, Intermediário, Avançado, etc.)
- Nível 2 (3-5 filhos cada): temas principais de cada fase
- Nível 3 (2-3 filhos, opcional): habilidades ou conceitos específicos
- Todos os labels: máx 24 caracteres, sem caracteres especiais
- Mostre a progressão do aprendizado de forma clara e motivadora

Retorne APENAS o JSON a seguir (sem markdown, sem explicações):
{
  "label": "nome do plano",
  "children": [
    {
      "label": "fase",
      "children": [
        { "label": "tema", "children": [{ "label": "conceito" }] }
      ]
    }
  ]
}`;
  }

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1500,
    messages: [{ role: 'user', content: prompt }],
  });

  const raw = message.content[0].type === 'text' ? message.content[0].text.trim() : '';
  const cleaned = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();

  try {
    const nodes = JSON.parse(cleaned);
    return NextResponse.json({ nodes });
  } catch {
    return NextResponse.json({ error: 'Erro ao processar mapa. Tente novamente.' }, { status: 500 });
  }
}
