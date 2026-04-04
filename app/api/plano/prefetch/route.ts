import { NextResponse } from 'next/server';
import { ensureInit } from '@/lib/db';
import { auth } from '@/auth';
import { getVideosWithCache } from '@/lib/video-cache';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    const userId = session.user.id;

    const db = await ensureInit();
    const channelsResult = await db.execute({
      sql: 'SELECT * FROM channels WHERE user_id = ?',
      args: [userId],
    });
    const channels = channelsResult.rows as unknown as {
      id: number; channel_id: string; is_playlist: number;
    }[];

    if (!channels.length) {
      return NextResponse.json({ error: 'Adicione pelo menos um canal antes de gerar o plano.' }, { status: 400 });
    }

    // Busca vídeos de todos os canais em paralelo e salva no cache
    const results = await Promise.allSettled(
      channels.map((ch) => getVideosWithCache(ch.channel_id, ch.is_playlist === 1, userId, db))
    );

    let totalVideos = 0;
    let quotaError = false;
    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      if (r.status === 'fulfilled') {
        totalVideos += r.value.videos.length;
      } else {
        const msg = String(r.reason);
        if (msg.includes('quota') || msg.includes('403')) quotaError = true;
        console.error(`[Prefetch] Erro no canal ${channels[i].channel_id}:`, r.reason);
      }
    }

    if (totalVideos === 0) {
      if (quotaError) {
        return NextResponse.json({ error: 'Cota diária da YouTube API esgotada. Aguarde até amanhã.' }, { status: 429 });
      }
      return NextResponse.json({ error: 'Nenhum vídeo encontrado nos seus canais.' }, { status: 404 });
    }

    console.log(`[Prefetch] Cache populado: ${totalVideos} vídeos.`);
    return NextResponse.json({ ok: true, videos: totalVideos });

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('[Prefetch] Erro geral:', msg);
    return NextResponse.json({ error: 'Erro ao buscar vídeos dos canais. Tente novamente.' }, { status: 500 });
  }
}
