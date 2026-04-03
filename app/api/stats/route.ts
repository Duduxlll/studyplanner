import { NextResponse } from 'next/server';
import { ensureInit } from '@/lib/db';
import { auth } from '@/auth';

export const runtime = 'nodejs';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const db = await ensureInit();
  const userId = session.user.id;

  const totalsResult = await db.execute({
    sql: `SELECT
            COUNT(*) as total_videos,
            SUM(pv.duration_minutes) as total_minutes,
            SUM(CASE WHEN pv.watched = 1 THEN 1 ELSE 0 END) as watched_videos,
            SUM(CASE WHEN pv.watched = 1 THEN pv.duration_minutes ELSE 0 END) as watched_minutes
          FROM plan_videos pv
          INNER JOIN plans p ON p.id = pv.plan_id
          WHERE p.user_id = ?`,
    args: [userId],
  });

  const totals = totalsResult.rows[0] ?? { total_videos: 0, total_minutes: 0, watched_videos: 0, watched_minutes: 0 };

  const plansCountResult = await db.execute({
    sql: 'SELECT COUNT(*) as count FROM plans WHERE user_id = ?',
    args: [userId],
  });
  const plansCount = Number(plansCountResult.rows[0]?.count ?? 0);

  const planProgressResult = await db.execute({
    sql: `SELECT
            p.id, p.title, p.topics, p.total_days, p.hours_per_day, p.created_at,
            COUNT(pv.id) as total_videos,
            SUM(pv.duration_minutes) as total_minutes,
            SUM(CASE WHEN pv.watched = 1 THEN 1 ELSE 0 END) as watched_videos,
            SUM(CASE WHEN pv.watched = 1 THEN pv.duration_minutes ELSE 0 END) as watched_minutes
          FROM plans p
          LEFT JOIN plan_videos pv ON pv.plan_id = p.id
          WHERE p.user_id = ?
          GROUP BY p.id
          ORDER BY p.created_at DESC`,
    args: [userId],
  });

  const byLevelResult = await db.execute({
    sql: `SELECT pv.level,
                 COUNT(*) as total,
                 SUM(CASE WHEN pv.watched = 1 THEN 1 ELSE 0 END) as watched
          FROM plan_videos pv
          INNER JOIN plans p ON p.id = pv.plan_id
          WHERE p.user_id = ?
          GROUP BY pv.level`,
    args: [userId],
  });

  const cacheResult = await db.execute({
    sql: `SELECT COUNT(DISTINCT channel_id) as channels_cached, COUNT(*) as total_cached
          FROM channel_videos_cache
          WHERE fetched_at > datetime('now', '-7 days')`,
    args: [],
  });

  return NextResponse.json({
    totals,
    plansCount,
    planProgress: planProgressResult.rows,
    byLevel: byLevelResult.rows,
    cacheStats: cacheResult.rows[0] ?? { channels_cached: 0, total_cached: 0 },
  });
}
