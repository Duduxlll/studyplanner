import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { ensureInit } from '@/lib/db';
import { auth } from '@/auth';
import { getAllChannelVideos, getPlaylistVideos, filterVideosByTopics, VideoInfo } from '@/lib/youtube';
import type { Client } from '@libsql/client';

export const runtime = 'nodejs';
export const maxDuration = 60;

const client = new Anthropic();
const CACHE_DAYS = 7;

interface PlanVideo {
  title: string;
  url: string;
  channel: string;
  duration_minutes: number;
  description: string;
  level: string;
}

interface PlanDay {
  day: number;
  theme?: string;
  videos: PlanVideo[];
}

async function getVideosWithCache(
  channelId: string,
  isPlaylist: boolean,
  userId: string,
  db: Client
): Promise<{ videos: VideoInfo[]; fromCache: boolean }> {
  const cached = await db.execute({
    sql: `SELECT video_id as videoId, title, url, channel_name as channelName,
                 duration_minutes as durationMinutes, thumbnail
          FROM channel_videos_cache
          WHERE user_id = ? AND channel_id = ?
          AND fetched_at > datetime('now', '-${CACHE_DAYS} days')`,
    args: [userId, channelId],
  });

  if (cached.rows.length > 0) {
    console.log(`[Cache] ${cached.rows.length} vídeos para ${channelId} (cache válido).`);
    return { videos: cached.rows as unknown as VideoInfo[], fromCache: true };
  }

  const videos = isPlaylist
    ? await getPlaylistVideos(channelId)
    : await getAllChannelVideos(channelId);

  if (videos.length > 0) {
    await db.batch(
      videos.map((v) => ({
        sql: `INSERT OR REPLACE INTO channel_videos_cache
              (user_id, channel_id, video_id, title, url, channel_name, duration_minutes, thumbnail, fetched_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
        args: [userId, channelId, v.videoId, v.title, v.url, v.channelName, v.durationMinutes, v.thumbnail ?? null],
      })),
      'write'
    );
  }

  console.log(`[Cache] ${videos.length} vídeos para ${channelId} buscados e salvos.`);
  return { videos, fromCache: false };
}

function buildPrompt(
  videoList: string,
  dayStart: number,
  dayEnd: number,
  totalDays: number,
  hoursPerDay: number,
  topics: string[],
  instructions: string | undefined,
  minPorDia: number,
  maxPorDia: number
): string {
  return `Você é um curador especialista em trilhas de aprendizado. Tenho os seguintes vídeos disponíveis do YouTube (todos em português brasileiro):

${videoList}

Crie os DIAS ${dayStart} até ${dayEnd} (de uma trilha total de ${totalDays} dias) com ${hoursPerDay} hora(s) de estudo por dia.
Tópicos: ${topics.join(', ')}.
${instructions ? `\nINSTRUÇÕES ESPECIAIS DO USUÁRIO (siga com prioridade):\n${instructions}\n` : ''}
REGRAS OBRIGATÓRIAS DE TEMPO (CRÍTICO — não ignore):
- O total de minutos de cada dia deve ser entre ${minPorDia} e ${maxPorDia} minutos — NUNCA menos, NUNCA mais
- Some as durações EXATAS dos vídeos e verifique antes de fechar o dia
- Se um vídeo novo fizer ultrapassar ${maxPorDia} min, NÃO o inclua e encerre o dia
- NENHUM vídeo individual pode ter duração maior que ${maxPorDia} minutos

REGRAS DE PROGRESSÃO (muito importante):
- A trilha total de ${totalDays} dias segue do INICIANTE ao AVANÇADO
- Dias 1 até ${Math.ceil(totalDays * 0.3)}: conceitos fundamentais e introdutórios
- Dias ${Math.ceil(totalDays * 0.3) + 1} até ${Math.ceil(totalDays * 0.7)}: conceitos intermediários, aprofundamento
- Dias ${Math.ceil(totalDays * 0.7) + 1} até ${totalDays}: conceitos avançados, projetos, especialização
- Você está gerando os dias ${dayStart} a ${dayEnd}, respeite o nível de progressão correspondente
- Cada dia deve ter um TEMA COERENTE (ex: "Introdução a Cloud", "Docker na prática")
- Os vídeos de um mesmo dia devem se COMPLEMENTAR
- NÃO misture básico e avançado no mesmo dia

OUTRAS REGRAS:
- NUNCA repita o mesmo vídeo em dias diferentes
- Use APENAS vídeos da lista acima com as URLs EXATAS
- Se não houver vídeos suficientes, crie menos dias (não invente vídeos)
- Descrição: 1 frase explicando o que o aluno aprende
- O campo "day" de cada dia deve começar em ${dayStart} e ir até no máximo ${dayEnd}

Retorne SOMENTE um JSON válido, sem markdown:
{
  "days": [
    {
      "day": ${dayStart},
      "theme": "Tema do dia",
      "videos": [
        {
          "title": "título exato do vídeo",
          "url": "https://www.youtube.com/watch?v=...",
          "channel": "nome do canal",
          "duration_minutes": 30,
          "description": "O que você aprende neste vídeo.",
          "level": "básico"
        }
      ]
    }
  ]
}`;
}

async function callClaude(prompt: string): Promise<PlanDay[]> {
  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 32000,
    messages: [{ role: 'user', content: prompt }],
  });

  const raw = message.content[0].type === 'text' ? message.content[0].text : '';

  let cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
  if (jsonMatch) cleaned = jsonMatch[0];

  const parsed = JSON.parse(cleaned);
  if (!parsed?.days || !Array.isArray(parsed.days)) {
    throw new Error('Estrutura inválida: campo "days" ausente');
  }

  return parsed.days as PlanDay[];
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  const userId = session.user.id;

  try {
    const body = await req.json();
    const { topics, hours_per_day, total_days, instructions } = body as {
      topics: string[];
      hours_per_day: number;
      total_days: number;
      instructions?: string;
    };

    if (!topics?.length || !hours_per_day || !total_days) {
      return NextResponse.json({ error: 'Parâmetros inválidos' }, { status: 400 });
    }

    const db = await ensureInit();

    const channelsResult = await db.execute({
      sql: 'SELECT * FROM channels WHERE user_id = ?',
      args: [userId],
    });
    const channels = channelsResult.rows as unknown as {
      id: number; name: string; channel_id: string; thumbnail: string; is_playlist: number;
    }[];

    if (!channels.length) {
      return NextResponse.json({ error: 'Adicione pelo menos um canal antes de gerar o plano' }, { status: 400 });
    }

    // Vídeos já usados nos planos do usuário
    const usedResult = await db.execute({
      sql: `SELECT pv.youtube_url FROM plan_videos pv
            INNER JOIN plans p ON pv.plan_id = p.id
            WHERE p.user_id = ?`,
      args: [userId],
    });
    const usedUrls = new Set<string>(
      (usedResult.rows as unknown as { youtube_url: string }[]).map((r) => r.youtube_url)
    );
    console.log(`[Plano] ${usedUrls.size} vídeos já usados.`);

    const allVideos: VideoInfo[] = [];
    let quotaError = false;

    for (const ch of channels) {
      try {
        const { videos } = await getVideosWithCache(ch.channel_id, ch.is_playlist === 1, userId, db);
        allVideos.push(...videos);
      } catch (ytErr: unknown) {
        const msg = String(ytErr);
        if (msg.includes('quota') || msg.includes('403')) quotaError = true;
        console.error(`[YouTube] Erro no canal ${ch.channel_id}:`, ytErr);
      }
    }

    if (allVideos.length === 0) {
      if (quotaError) {
        return NextResponse.json({
          error: 'Cota diária da YouTube API esgotada. Aguarde até amanhã.',
        }, { status: 429 });
      }
      return NextResponse.json({
        error: 'Nenhum vídeo encontrado nos seus canais.',
      }, { status: 404 });
    }

    const seenIds = new Set<string>();
    const novosVideos = allVideos.filter((v) => {
      if (seenIds.has(v.videoId) || usedUrls.has(v.url)) return false;
      seenIds.add(v.videoId);
      return true;
    });

    const videosRelacionados = filterVideosByTopics(novosVideos, topics);
    if (!videosRelacionados.length) {
      return NextResponse.json({
        error: 'Todos os vídeos disponíveis já foram usados em planos anteriores. Clique em "🗑 Reset" para começar do zero.',
      }, { status: 404 });
    }

    const minPorDia = Math.round((hours_per_day - 0.5) * 60);
    const maxPorDia = Math.round((hours_per_day + 0.5) * 60);
    const videosValidos = videosRelacionados.filter((v) => v.durationMinutes <= maxPorDia);

    if (!videosValidos.length) {
      return NextResponse.json({
        error: `Nenhum vídeo dentro do limite de duração (máx ${maxPorDia}min). Tente aumentar as horas por dia.`,
      }, { status: 404 });
    }

    let allDays: PlanDay[] = [];

    if (total_days <= 12) {
      // Chamada única para planos curtos
      const videoList = videosValidos.slice(0, 150).map((v, i) =>
        `${i + 1}. "${v.title}" | Canal: ${v.channelName} | Duração: ${v.durationMinutes} min | URL: ${v.url}`
      ).join('\n');

      const prompt = buildPrompt(videoList, 1, total_days, total_days, hours_per_day, topics, instructions, minPorDia, maxPorDia);

      try {
        allDays = await callClaude(prompt);
      } catch (err) {
        console.error('[Claude] Erro na geração (único):', String(err));
        return NextResponse.json({ error: 'A IA retornou um formato inválido. Tente novamente.' }, { status: 500 });
      }
    } else {
      // Batching em 2 chamadas para planos longos
      const midDay = Math.ceil(total_days / 2);

      // Lote 1: dias 1 até midDay
      const videoList1 = videosValidos.slice(0, 150).map((v, i) =>
        `${i + 1}. "${v.title}" | Canal: ${v.channelName} | Duração: ${v.durationMinutes} min | URL: ${v.url}`
      ).join('\n');

      const prompt1 = buildPrompt(videoList1, 1, midDay, total_days, hours_per_day, topics, instructions, minPorDia, maxPorDia);

      let days1: PlanDay[];
      try {
        days1 = await callClaude(prompt1);
        console.log(`[Plano] Lote 1 gerado: ${days1.length} dias.`);
      } catch (err) {
        console.error('[Claude] Erro no lote 1:', String(err));
        return NextResponse.json({ error: 'A IA retornou um formato inválido no lote 1. Tente novamente.' }, { status: 500 });
      }

      // Filtra vídeos usados no lote 1
      const usedInBatch1 = new Set<string>(days1.flatMap((d) => d.videos.map((v) => v.url)));
      const videosParaLote2 = videosValidos.filter((v) => !usedInBatch1.has(v.url));

      let days2: PlanDay[] = [];
      if (videosParaLote2.length > 0) {
        const videoList2 = videosParaLote2.slice(0, 150).map((v, i) =>
          `${i + 1}. "${v.title}" | Canal: ${v.channelName} | Duração: ${v.durationMinutes} min | URL: ${v.url}`
        ).join('\n');

        const prompt2 = buildPrompt(videoList2, midDay + 1, total_days, total_days, hours_per_day, topics, instructions, minPorDia, maxPorDia);

        try {
          days2 = await callClaude(prompt2);
          console.log(`[Plano] Lote 2 gerado: ${days2.length} dias.`);
        } catch (err) {
          console.error('[Claude] Erro no lote 2 (usando apenas lote 1):', String(err));
        }
      } else {
        console.log('[Plano] Sem vídeos suficientes para lote 2.');
      }

      allDays = [...days1, ...days2];
    }

    // Salva o plano
    const planResult = await db.execute({
      sql: 'INSERT INTO plans (title, topics, hours_per_day, total_days, user_id) VALUES (?, ?, ?, ?, ?)',
      args: [
        `Plano: ${topics.join(', ')} — ${total_days} dias`,
        JSON.stringify(topics),
        hours_per_day,
        total_days,
        userId,
      ],
    });

    const planId = Number(planResult.lastInsertRowid);

    const videoStmts: { sql: string; args: (string | number | null)[] }[] = [];
    for (const day of allDays) {
      day.videos.forEach((video, idx) => {
        videoStmts.push({
          sql: `INSERT INTO plan_videos (plan_id, day, day_theme, title, youtube_url, duration_minutes, description, channel_name, level, order_in_day)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [planId, day.day, day.theme ?? null, video.title, video.url, video.duration_minutes, video.description, video.channel, video.level ?? 'básico', idx],
        });
      });
    }

    if (videoStmts.length > 0) {
      await db.batch(videoStmts, 'write');
    }

    console.log(`[Plano] Plano ${planId} salvo para user ${userId}. Total: ${allDays.length} dias.`);
    return NextResponse.json({ planId, totalDays: allDays.length }, { status: 201 });

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[Plano] Erro geral:', message);
    return NextResponse.json({ error: `Erro ao gerar plano: ${message}` }, { status: 500 });
  }
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const db = await ensureInit();
  const result = await db.execute({
    sql: 'SELECT * FROM plans WHERE user_id = ? ORDER BY created_at DESC',
    args: [session.user.id],
  });

  return NextResponse.json(result.rows);
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 });

  const db = await ensureInit();

  await db.execute({
    sql: 'DELETE FROM plan_videos WHERE plan_id = ? AND plan_id IN (SELECT id FROM plans WHERE user_id = ?)',
    args: [id, session.user.id],
  });
  await db.execute({
    sql: 'DELETE FROM plans WHERE id = ? AND user_id = ?',
    args: [id, session.user.id],
  });

  return NextResponse.json({ ok: true });
}
