import { NextRequest, NextResponse } from 'next/server';
import { ensureInit } from '@/lib/db';
import { auth } from '@/auth';

export const runtime = 'nodejs';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const db = await ensureInit();
  const result = await db.execute({
    sql: 'SELECT * FROM channels WHERE user_id = ? ORDER BY created_at DESC',
    args: [session.user.id],
  });

  const res = NextResponse.json(result.rows);
  res.headers.set('Cache-Control', 'private, max-age=30, stale-while-revalidate=60');
  return res;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const body = await req.json();
  const { name, channel_id, thumbnail, description, is_playlist } = body;

  if (!name || !channel_id) {
    return NextResponse.json({ error: 'name e channel_id são obrigatórios' }, { status: 400 });
  }

  const db = await ensureInit();

  const existing = await db.execute({
    sql: 'SELECT id FROM channels WHERE channel_id = ? AND user_id = ?',
    args: [channel_id, session.user.id],
  });
  if (existing.rows.length > 0) {
    return NextResponse.json({ error: 'Canal já adicionado' }, { status: 409 });
  }

  const result = await db.execute({
    sql: 'INSERT INTO channels (name, channel_id, thumbnail, description, is_playlist, user_id) VALUES (?, ?, ?, ?, ?, ?)',
    args: [name, channel_id, thumbnail ?? '', description ?? '', is_playlist ? 1 : 0, session.user.id],
  });

  return NextResponse.json({ id: Number(result.lastInsertRowid) }, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id obrigatório' }, { status: 400 });

  const db = await ensureInit();
  await db.execute({
    sql: 'DELETE FROM channels WHERE id = ? AND user_id = ?',
    args: [id, session.user.id],
  });

  return NextResponse.json({ ok: true });
}
