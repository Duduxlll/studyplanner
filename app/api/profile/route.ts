import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { ensureInit } from '@/lib/db';

export const runtime = 'nodejs';

async function upsertUser(userId: string, email: string, name: string) {
  const db = await ensureInit();
  await db.execute({
    sql: `INSERT INTO users (id, email, name, email_verified)
          VALUES (?, ?, ?, 1)
          ON CONFLICT(id) DO NOTHING`,
    args: [userId, email, name],
  });
  return db;
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const db = await ensureInit();

  // Garante que usuário existe (Google pode não ter criado ainda)
  await upsertUser(session.user.id, session.user.email ?? '', session.user.name ?? '');

  const userResult = await db.execute({
    sql: 'SELECT id, email, name, bio, avatar_url, banner_url, theme, email_verified, created_at FROM users WHERE id = ?',
    args: [session.user.id],
  });

  const user = userResult.rows[0] as unknown as {
    id: string; email: string; name: string; bio: string;
    avatar_url: string; banner_url: string; theme: string;
    email_verified: number; created_at: string;
  } | undefined;

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
      id: session.user.id, email: session.user.email, name: session.user.name,
      bio: '', avatar_url: '', banner_url: '', theme: 'dark', email_verified: 1,
      created_at: new Date().toISOString(),
    },
    stats,
    googleImage: session.user.image ?? null,
  });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const body = await req.json() as {
    name?: string; bio?: string; theme?: string;
    avatar_url?: string; banner_url?: string;
  };

  const { name, bio, theme, avatar_url, banner_url } = body;

  // Validações
  if (name !== undefined && !name.trim()) {
    return NextResponse.json({ error: 'Nome não pode ficar vazio.' }, { status: 400 });
  }
  if (bio && bio.length > 200) {
    return NextResponse.json({ error: 'Bio muito longa (máx 200 chars).' }, { status: 400 });
  }
  if (theme && !['dark', 'light'].includes(theme)) {
    return NextResponse.json({ error: 'Tema inválido.' }, { status: 400 });
  }
  // Limita tamanho das imagens (base64): ~2MB max
  const MAX_IMG = 2 * 1024 * 1024 * 1.37; // base64 overhead
  if (avatar_url && avatar_url.length > MAX_IMG) {
    return NextResponse.json({ error: 'Avatar muito grande (máx 2MB).' }, { status: 400 });
  }
  if (banner_url && banner_url.length > MAX_IMG) {
    return NextResponse.json({ error: 'Banner muito grande (máx 2MB).' }, { status: 400 });
  }

  const db = await ensureInit();

  // Upsert completo — garante que o usuário existe antes de atualizar
  await db.execute({
    sql: `INSERT INTO users (id, email, name, email_verified) VALUES (?, ?, ?, 1)
          ON CONFLICT(id) DO NOTHING`,
    args: [session.user.id, session.user.email ?? '', session.user.name ?? ''],
  });

  // Monta SET dinâmico — só atualiza os campos enviados
  const fields: string[] = [];
  const args: (string | number | null)[] = [];

  if (name !== undefined)       { fields.push('name = ?');       args.push(name.trim()); }
  if (bio !== undefined)        { fields.push('bio = ?');        args.push(bio.trim()); }
  if (theme !== undefined)      { fields.push('theme = ?');      args.push(theme); }
  if (avatar_url !== undefined) { fields.push('avatar_url = ?'); args.push(avatar_url); }
  if (banner_url !== undefined) { fields.push('banner_url = ?'); args.push(banner_url); }

  if (fields.length > 0) {
    args.push(session.user.id);
    await db.execute({
      sql: `UPDATE users SET ${fields.join(', ')} WHERE id = ?`,
      args,
    });
  }

  return NextResponse.json({ ok: true });
}
