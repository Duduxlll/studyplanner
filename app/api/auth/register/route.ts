import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { ensureInit } from '@/lib/db';
import { rateLimitCheck, getIp, rateLimitResponse } from '@/lib/rate-limit';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const rl = rateLimitCheck(`register:${getIp(req)}`, 5, 15 * 60 * 1000);
  if (!rl.ok) return rateLimitResponse(rl.retryAfter);

  try {
    const { name, email, password } = await req.json() as {
      name: string;
      email: string;
      password: string;
    };

    if (!name?.trim() || !email?.trim() || !password) {
      return NextResponse.json({ error: 'Preencha todos os campos.' }, { status: 400 });
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Email inválido.' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'A senha precisa ter pelo menos 6 caracteres.' }, { status: 400 });
    }

    const db = await ensureInit();

    const existing = await db.execute({
      sql: 'SELECT id FROM users WHERE email = ?',
      args: [email.toLowerCase()],
    });

    if (existing.rows.length > 0) {
      return NextResponse.json({ error: 'Este email já está cadastrado.' }, { status: 409 });
    }

    const hash = await bcrypt.hash(password, 12);
    const id = crypto.randomUUID();
    await db.execute({
      sql: 'INSERT INTO users (id, email, name, password_hash, email_verified) VALUES (?, ?, ?, ?, 1)',
      args: [id, email.toLowerCase(), name.trim(), hash],
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[Register]', err);
    return NextResponse.json({ error: 'Erro interno. Tente novamente.' }, { status: 500 });
  }
}
