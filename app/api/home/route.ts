import { NextResponse } from 'next/server';
import { ensureInit } from '@/lib/db';
import { auth } from '@/auth';

export const runtime = 'nodejs';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const db = await ensureInit();
  const userId = session.user.id;

  const [channelsResult, plansResult] = await Promise.all([
    db.execute({
      sql: 'SELECT id, name, channel_id, thumbnail, description, is_playlist FROM channels WHERE user_id = ? ORDER BY created_at DESC',
      args: [userId],
    }),
    db.execute({
      sql: 'SELECT id, title, topics, hours_per_day, total_days, created_at FROM plans WHERE user_id = ? ORDER BY created_at DESC',
      args: [userId],
    }),
  ]);

  const res = NextResponse.json({
    channels: channelsResult.rows,
    plans: plansResult.rows,
  });
  res.headers.set('Cache-Control', 'private, max-age=30, stale-while-revalidate=60');
  return res;
}
