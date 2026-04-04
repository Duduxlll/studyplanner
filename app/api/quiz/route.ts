import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { ensureInit } from '@/lib/db';
import Anthropic from '@anthropic-ai/sdk';

export const runtime = 'nodejs';
export const maxDuration = 60;

const client = new Anthropic();

export interface QuizQuestion {
  question: string;
  options: string[];
  correct: number;
  explanation: string;
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

    const { planId, day } = await req.json() as { planId: number; day: number };
    if (!planId || !day) return NextResponse.json({ error: 'planId e day obrigatórios' }, { status: 400 });

    const db = await ensureInit();

    // Verifica que o plano pertence ao usuário
    const planCheck = await db.execute({
      sql: 'SELECT id FROM plans WHERE id = ? AND user_id = ?',
      args: [planId, session.user.id],
    });
    if (!planCheck.rows.length) return NextResponse.json({ error: 'Plano não encontrado' }, { status: 404 });

    // Retorna do cache se já gerado
    const cached = await db.execute({
      sql: 'SELECT questions FROM quizzes WHERE plan_id = ? AND day = ?',
      args: [planId, day],
    });
    if (cached.rows.length > 0) {
      const questions: QuizQuestion[] = JSON.parse(String(cached.rows[0].questions));
      return NextResponse.json({ questions, cached: true });
    }

    // Busca vídeos do dia
    const videosResult = await db.execute({
      sql: `SELECT title, channel_name, description, level FROM plan_videos
            WHERE plan_id = ? AND day = ? ORDER BY order_in_day`,
      args: [planId, day],
    });
    type VRow = { title: string; channel_name: string; description: string; level: string };
    const videos = videosResult.rows as unknown as VRow[];

    if (!videos.length) return NextResponse.json({ error: 'Nenhum vídeo encontrado para este dia' }, { status: 404 });

    const videoList = videos.map((v, i) =>
      `${i + 1}. "${v.title}" (${v.channel_name}) — Nível: ${v.level}\n   Sobre: ${v.description ?? 'sem descrição'}`
    ).join('\n\n');

    const prompt = `Você é um professor especialista em avaliação educacional. Crie um quiz de 4 perguntas de múltipla escolha baseado nos vídeos do Dia ${day} abaixo.

Vídeos:
${videoList}

REGRAS:
- 4 perguntas que testam compreensão real dos conceitos (não apenas decoreba)
- 4 opções por pergunta (A, B, C, D)
- Varie o tipo: conceitual, prático, comparativo, aplicação
- Explicação clara e educativa para a resposta correta
- Linguagem em português do Brasil
- Dificuldade adequada ao nível dos vídeos

Retorne APENAS este JSON (sem markdown):
[
  {
    "question": "texto da pergunta",
    "options": ["opção A", "opção B", "opção C", "opção D"],
    "correct": 0,
    "explanation": "Por que esta é a resposta correta e o que isso significa na prática."
  }
]`;

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    });

    const raw = message.content[0].type === 'text' ? message.content[0].text.trim() : '';
    const cleaned = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();

    let questions: QuizQuestion[];
    try {
      questions = JSON.parse(cleaned);
      if (!Array.isArray(questions) || !questions.length) throw new Error('invalid');
    } catch {
      return NextResponse.json({ error: 'Erro ao processar quiz. Tente novamente.' }, { status: 500 });
    }

    // Salva no cache
    await db.execute({
      sql: 'INSERT OR REPLACE INTO quizzes (plan_id, day, questions) VALUES (?, ?, ?)',
      args: [planId, day, JSON.stringify(questions)],
    });

    return NextResponse.json({ questions, cached: false });

  } catch (err) {
    console.error('[Quiz]', err);
    return NextResponse.json({ error: 'Erro ao gerar quiz.' }, { status: 500 });
  }
}
