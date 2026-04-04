import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { ensureInit } from '@/lib/db';
import Anthropic from '@anthropic-ai/sdk';

export const runtime = 'nodejs';
export const maxDuration = 30;

const client = new Anthropic();

export interface AISummary {
  summary: string;
  keyPoints: string[];
  whyItMatters: string;
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

    const { videoId } = await req.json() as { videoId: number };
    if (!videoId) return NextResponse.json({ error: 'videoId obrigatório' }, { status: 400 });

    const db = await ensureInit();

    // Busca o vídeo verificando que pertence ao usuário
    const videoResult = await db.execute({
      sql: `SELECT pv.id, pv.title, pv.channel_name, pv.description, pv.level,
                   pv.duration_minutes, pv.ai_summary, pv.day, pv.day_theme
            FROM plan_videos pv
            INNER JOIN plans p ON p.id = pv.plan_id
            WHERE pv.id = ? AND p.user_id = ?`,
      args: [videoId, session.user.id],
    });

    if (!videoResult.rows.length) return NextResponse.json({ error: 'Vídeo não encontrado' }, { status: 404 });

    type VRow = {
      id: number; title: string; channel_name: string; description: string;
      level: string; duration_minutes: number; ai_summary: string | null;
      day: number; day_theme: string | null;
    };
    const video = videoResult.rows[0] as unknown as VRow;

    // Retorna do cache se já gerado
    if (video.ai_summary) {
      try {
        const parsed: AISummary = JSON.parse(video.ai_summary);
        return NextResponse.json({ ...parsed, cached: true });
      } catch {
        // se corrompido, regera
      }
    }

    const prompt = `Você é um mentor educacional. Crie um resumo de aprendizado para este vídeo do YouTube.

Título: "${video.title}"
Canal: ${video.channel_name}
Duração: ${video.duration_minutes} minutos
Nível: ${video.level}
Tema do dia: ${video.day_theme ?? 'não informado'}
Descrição: ${video.description ?? 'não disponível'}

Crie um resumo educacional que ajude o aluno a entender o que vai aprender ANTES de assistir.

Retorne APENAS este JSON (sem markdown):
{
  "summary": "2-3 frases descrevendo o que o vídeo ensina de forma clara e motivadora",
  "keyPoints": ["conceito chave 1", "conceito chave 2", "conceito chave 3"],
  "whyItMatters": "1 frase explicando por que este conteúdo é importante na trilha de aprendizado"
}`;

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 600,
      messages: [{ role: 'user', content: prompt }],
    });

    const raw = message.content[0].type === 'text' ? message.content[0].text.trim() : '';
    const cleaned = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();

    let result: AISummary;
    try {
      result = JSON.parse(cleaned);
      if (!result.summary || !result.keyPoints) throw new Error('invalid');
    } catch {
      return NextResponse.json({ error: 'Erro ao processar resumo. Tente novamente.' }, { status: 500 });
    }

    // Salva permanentemente no banco
    await db.execute({
      sql: `UPDATE plan_videos SET ai_summary = ?
            WHERE id = ? AND plan_id IN (SELECT id FROM plans WHERE user_id = ?)`,
      args: [JSON.stringify(result), videoId, session.user.id],
    });

    return NextResponse.json({ ...result, cached: false });

  } catch (err) {
    console.error('[AI Notes]', err);
    return NextResponse.json({ error: 'Erro ao gerar resumo.' }, { status: 500 });
  }
}
