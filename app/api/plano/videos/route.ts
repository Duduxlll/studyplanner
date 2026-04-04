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
  const result = await db.execute({
    sql: `SELECT pv.* FROM plan_videos pv
          INNER JOIN plans p ON p.id = pv.plan_id
          WHERE pv.plan_id = ? AND p.user_id = ?
          ORDER BY pv.day, pv.order_in_day`,
    args: [planId, session.user.id],
  });

  return NextResponse.json(result.rows);
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const id = req.nextUrl.searchParams.get('id');
  const watched = req.nextUrl.searchParams.get('watched');
  if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 });

  const db = await ensureInit();

  const contentType = req.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    try {
      const body = await req.json();
      if ('notes' in body) {
        await db.execute({
          sql: `UPDATE plan_videos SET notes = ?
                WHERE id = ? AND plan_id IN (SELECT id FROM plans WHERE user_id = ?)`,
          args: [body.notes ?? '', id, session.user.id],
        });
        return NextResponse.json({ ok: true });
      }
    } catch {
      // cai para watched
    }
  }

  if (watched !== null) {
    const isWatched = watched === '1';
    await db.execute({
      sql: `UPDATE plan_videos SET watched = ?, watched_at = ?
            WHERE id = ? AND plan_id IN (SELECT id FROM plans WHERE user_id = ?)`,
      args: [isWatched ? 1 : 0, isWatched ? new Date().toISOString() : null, id, session.user.id],
    });
  }

  return NextResponse.json({ ok: true });
}
