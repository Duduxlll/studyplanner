import { NextRequest, NextResponse } from 'next/server';
import { ensureInit } from '@/lib/db';
import { auth } from '@/auth';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const planId = req.nextUrl.searchParams.get('planId');
  if (!planId) return NextResponse.json({ error: 'planId obrigatório' }, { status: 400 });

  const db = await ensureInit();

  // Busca plano e vídeos em paralelo numa única chamada ao servidor
  const [planResult, videosResult] = await Promise.all([
    db.execute({
      sql: 'SELECT id, title, topics, hours_per_day, total_days, created_at FROM plans WHERE id = ? AND user_id = ?',
      args: [planId, session.user.id],
    }),
    db.execute({
      sql: `SELECT pv.* FROM plan_videos pv
            INNER JOIN plans p ON p.id = pv.plan_id
            WHERE pv.plan_id = ? AND p.user_id = ?
            ORDER BY pv.day, pv.order_in_day`,
      args: [planId, session.user.id],
    }),
  ]);

  if (planResult.rows.length === 0) {
    return NextResponse.json({ error: 'Plano não encontrado' }, { status: 404 });
  }

  const res = NextResponse.json({
    plan: planResult.rows[0],
    videos: videosResult.rows,
  });
  res.headers.set('Cache-Control', 'private, max-age=30, stale-while-revalidate=60');
  return res;
}
