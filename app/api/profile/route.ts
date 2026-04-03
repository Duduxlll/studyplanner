import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { ensureInit } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const db = await ensureInit();

  // Busca dados do usuário
  const userResult = await db.execute({
    sql: 'SELECT id, email, name, bio, avatar_url, email_verified, created_at FROM users WHERE id = ?',
    args: [session.user.id],
  });

  // Se veio pelo Google o usuário pode não existir na tabela users — cria
  if (userResult.rows.length === 0) {
    await db.execute({
      sql: 'INSERT OR IGNORE INTO users (id, email, name, email_verified) VALUES (?, ?, ?, 1)',
      args: [session.user.id, session.user.email ?? '', session.user.name ?? ''],
    });
  }

  const user = userResult.rows[0] as unknown as {
    id: string; email: string; name: string; bio: string;
    avatar_url: string; email_verified: number; created_at: string;
  } | undefined;

  // Stats
  const statsResult = await db.execute({
    sql: `SELECT
      (SELECT COUNT(*) FROM plans WHERE user_id = ?) AS total_plans,
      (SELECT COUNT(*) FROM plan_videos pv JOIN plans p ON pv.plan_id = p.id WHERE p.user_id = ? AND pv.watched = 1) AS total_watched,
      (SELECT COUNT(*) FROM plan_videos pv JOIN plans p ON pv.plan_id = p.id WHERE p.user_id = ?) AS total_videos,
      (SELECT COUNT(*) FROM channels WHERE user_id = ?) AS total_channels`,
    args: [session.user.id, session.user.id, session.user.id, session.user.id],
  });

  const stats = statsResult.rows[0] as unknown as {
    total_plans: number; total_watched: number; total_videos: number; total_channels: number;
  };

  return NextResponse.json({
    user: user ?? {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      bio: '',
      avatar_url: session.user.image ?? '',
      email_verified: 1,
      created_at: new Date().toISOString(),
    },
    stats,
    googleImage: session.user.image ?? null,
  });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { name, bio } = await req.json() as { name: string; bio: string };

  if (!name?.trim()) return NextResponse.json({ error: 'Nome é obrigatório.' }, { status: 400 });
  if (bio && bio.length > 200) return NextResponse.json({ error: 'Bio muito longa (máx 200 chars).' }, { status: 400 });

  const db = await ensureInit();

  // Upsert — pode ser usuário Google que nunca entrou nessa tabela
  await db.execute({
    sql: `INSERT INTO users (id, email, name, bio, email_verified)
          VALUES (?, ?, ?, ?, 1)
          ON CONFLICT(id) DO UPDATE SET name = excluded.name, bio = excluded.bio`,
    args: [session.user.id, session.user.email ?? '', name.trim(), bio?.trim() ?? ''],
  });

  return NextResponse.json({ ok: true });
}
