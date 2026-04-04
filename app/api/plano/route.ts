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

async function callClaudeOnce(prompt: string): Promise<PlanDay[]> {
  // Envolve a chamada à API em try/catch para capturar erros do SDK (rate limit, overload, etc.)
  let message: Awaited<ReturnType<typeof client.messages.create>>;
  try {
    message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 16000,
      messages: [{ role: 'user', content: prompt }],
    });
  } catch (sdkErr) {
    const msg = sdkErr instanceof Error ? sdkErr.message : String(sdkErr);
    console.error('[Claude] Erro SDK:', msg.slice(0, 300));
    // Re-lança como mensagem limpa para o caller decidir se faz retry
    throw new Error(`SDK: ${msg.slice(0, 200)}`);
  }

  if (message.stop_reason === 'max_tokens') {
    throw new Error('Resposta cortada pelo limite de tokens. Tente reduzir os dias ou as horas/dia.');
  }

  const raw = message.content[0]?.type === 'text' ? message.content[0].text : '';

  // Anthropic às vezes retorna erro em texto puro em vez de lançar exceção
  if (!raw || /^(An error|Error|{"type":"error)/i.test(raw.trimStart())) {
    console.error('[Claude] Resposta de erro em texto:', raw.slice(0, 200));
    throw new Error('indisponível');   // palavra-chave que isTransient() reconhece → retry
  }

  let cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  const jsonMatch = cleaned.match(/\{[\s\S]*\}/);

  if (!jsonMatch) {
    console.error('[Claude] Sem JSON na resposta:', raw.slice(0, 300));
    throw new Error('A IA não retornou o formato esperado. Tente novamente.');
  }

  const parsed = JSON.parse(jsonMatch[0]);
  if (!parsed?.days || !Array.isArray(parsed.days)) {
    throw new Error('Estrutura de resposta inválida (campo "days" ausente).');
  }

  return parsed.days as PlanDay[];
}

function isTransient(msg: string) {
  return (
    msg.includes('indisponível') ||
    msg.includes('overloaded') ||
    msg.includes('529') ||
    msg.includes('502') ||
    msg.includes('503') ||
    msg.includes('An error') ||
    msg.includes('ECONNRESET') ||
    msg.includes('fetch failed')
  );
}

async function callClaude(prompt: string): Promise<PlanDay[]> {
  try {
    return await callClaudeOnce(prompt);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (isTransient(msg)) {
      console.warn('[Claude] Erro transitório, retry em 4s...', msg.slice(0, 120));
      await new Promise(r => setTimeout(r, 4000));
      return await callClaudeOnce(prompt);
    }
    throw err;
  }
}

export async function POST(req: NextRequest) {
  // Um único try/catch cobre TUDO — auth(), db, Claude, etc. — garantindo sempre JSON
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    const userId = session.user.id;

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

    // Calcula quantos vídeos enviar por chamada com base nos parâmetros do plano
    // Estimativa: (horas/dia × 60 / duração média de 40min) × dias × 1.5 de folga, máx 200
    function videosNeeded(days: number) {
      return Math.min(200, Math.ceil((hours_per_day * 60) / 40) * days * 2);
    }

    function toList(videos: VideoInfo[], limit: number) {
      return videos.slice(0, limit).map((v, i) =>
        `${i + 1}. "${v.title}" | Canal: ${v.channelName} | Duração: ${v.durationMinutes} min | URL: ${v.url}`
      ).join('\n');
    }

    let allDays: PlanDay[] = [];

    if (total_days <= 12) {
      // ── Plano curto: 1 chamada ──────────────────────────────────────────────
      const prompt = buildPrompt(
        toList(videosValidos, videosNeeded(total_days)),
        1, total_days, total_days, hours_per_day, topics, instructions, minPorDia, maxPorDia
      );
      allDays = await callClaude(prompt);

    } else {
      // ── Plano longo: 2 chamadas em PARALELO ─────────────────────────────────
      // Divide o pool de vídeos em dois grupos já de antemão, sem esperar o lote 1
      const midDay = Math.ceil(total_days / 2);
      const daysLote2 = total_days - midDay;

      const metade = Math.ceil(videosValidos.length / 2);
      const pool1 = videosValidos.slice(0, metade);
      const pool2 = videosValidos.slice(metade);

      const prompt1 = buildPrompt(
        toList(pool1, videosNeeded(midDay)),
        1, midDay, total_days, hours_per_day, topics, instructions, minPorDia, maxPorDia
      );
      const prompt2 = buildPrompt(
        toList(pool2, videosNeeded(daysLote2)),
        midDay + 1, total_days, total_days, hours_per_day, topics, instructions, minPorDia, maxPorDia
      );

      // Dispara os dois ao mesmo tempo — tempo total ≈ tempo de 1 chamada
      const [result1, result2] = await Promise.allSettled([
        callClaude(prompt1),
        callClaude(prompt2),
      ]);

      if (result1.status === 'rejected') {
        const msg = result1.reason instanceof Error ? result1.reason.message : String(result1.reason);
        console.error('[Claude] Lote 1 falhou:', msg);
        throw new Error(msg);   // deixa o catch externo formatar a resposta
      }

      const days1 = result1.value;
      const days2 = result2.status === 'fulfilled' ? result2.value : [];
      if (result2.status === 'rejected') {
        console.error('[Claude] Lote 2 falhou (plano parcial):', result2.reason);
      }

      allDays = [...days1, ...days2];
      console.log(`[Plano] Gerado em paralelo: ${days1.length} + ${days2.length} dias.`);
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
    const raw = err instanceof Error ? err.message : String(err);
    console.error('[Plano] Erro geral:', raw);

    // Transforma erros técnicos em mensagens amigáveis
    let friendly = 'Não foi possível gerar o plano. Tente novamente em alguns segundos.';
    if (raw.includes('credit') || raw.includes('billing') || raw.includes('balance')) {
      friendly = 'Créditos da API esgotados. Entre em contato com o suporte.';
    } else if (raw.includes('timeout') || raw.includes('TIMEOUT') || raw.includes('timed out')) {
      friendly = 'A geração demorou demais. Tente um plano com menos dias ou menos horas/dia.';
    } else if (raw.includes('quota') || raw.includes('rate') || raw.includes('429')) {
      friendly = 'Muitas requisições simultâneas. Aguarde alguns segundos e tente novamente.';
    } else if (raw.includes('truncada') || raw.includes('max_tokens')) {
      friendly = 'Plano muito grande para gerar de uma vez. Tente reduzir os dias ou as horas/dia.';
    } else if (raw.includes('indisponível') || raw.includes('overloaded') || raw.includes('529')) {
      friendly = 'Serviço de IA temporariamente sobrecarregado. Tente novamente em instantes.';
    }

    return NextResponse.json({ error: friendly }, { status: 500 });
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
