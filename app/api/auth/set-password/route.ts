import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/auth';
import { ensureInit } from '@/lib/db';
import bcrypt from 'bcryptjs';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const { password } = await req.json() as { password?: string };

  if (!password || password.length < 6) {
    return NextResponse.json({ error: 'Senha deve ter pelo menos 6 caracteres.' }, { status: 400 });
  }

  const hash = await bcrypt.hash(password, 12);
  const db = await ensureInit();

  await db.execute({
    sql: 'UPDATE users SET password_hash = ? WHERE id = ?',
    args: [hash, session.user.id],
  });

  return NextResponse.json({ ok: true });
}
