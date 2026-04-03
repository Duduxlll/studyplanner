import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { ensureInit } from '@/lib/db';
import { auth } from '@/auth';
import { resolveChannel } from '@/lib/youtube';

export const runtime = 'nodejs';

const client = new Anthropic();

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  try {
    const topicsParam = req.nextUrl.searchParams.get('topics') ?? '';
    const topics = topicsParam ? topicsParam.split(',').map((t) => t.trim()) : ['programação', 'tecnologia'];

    const db = await ensureInit();
    const existingResult = await db.execute({
      sql: 'SELECT name FROM channels WHERE user_id = ?',
      args: [session.user.id],
    });
    const existingNames = (existingResult.rows as unknown as { name: string }[]).map((c) => c.name);

    const prompt = `Você é um especialista em canais brasileiros do YouTube sobre tecnologia.

Sugira 6 canais brasileiros do YouTube (em português) sobre os tópicos: ${topics.join(', ')}.
${existingNames.length > 0 ? `NÃO inclua: ${existingNames.join(', ')}.` : ''}

Use apenas canais reais que existem no YouTube Brasil.

Retorne SOMENTE um JSON válido, sem markdown:
{
  "channels": [
    {
      "name": "Nome exato do canal",
      "description": "Uma frase sobre o que o canal ensina"
    }
  ]
}`;

    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }],
    });

    const raw = message.content[0].type === 'text' ? message.content[0].text : '{}';
    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const suggestions = (JSON.parse(cleaned).channels ?? []) as { name: string; description: string }[];

    const results = await Promise.allSettled(
      suggestions.slice(0, 6).map(async (s) => {
        const info = await resolveChannel(s.name);
        return {
          name: info.name,
          channelId: info.channelId,
          thumbnail: info.thumbnail,
          description: s.description,
        };
      })
    );

    const verified = results
      .filter((r) => r.status === 'fulfilled')
      .map((r) => (r as PromiseFulfilledResult<typeof r extends PromiseFulfilledResult<infer T> ? T : never>).value);

    return NextResponse.json({ channels: verified });
  } catch (err) {
    console.error('[Suggestions] Erro:', err);
    return NextResponse.json({ channels: [] });
  }
}
