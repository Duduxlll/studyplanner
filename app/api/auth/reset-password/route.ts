import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { ensureInit } from '@/lib/db';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { email, code, password } = await req.json() as {
      email: string;
      code: string;
      password: string;
    };

    if (!email || !code || !password) {
      return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'A senha precisa ter pelo menos 6 caracteres.' }, { status: 400 });
    }

    const db = await ensureInit();

    const result = await db.execute({
      sql: "SELECT * FROM verification_codes WHERE email = ? AND code = ? AND type = 'reset'",
      args: [email.toLowerCase(), code.trim()],
    });

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Código inválido.' }, { status: 400 });
    }

    const row = result.rows[0] as unknown as { expires_at: string };
    if (new Date(row.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Código expirado. Solicite um novo.' }, { status: 400 });
    }

    const hash = await bcrypt.hash(password, 12);
    await db.execute({
      sql: 'UPDATE users SET password_hash = ? WHERE email = ?',
      args: [hash, email.toLowerCase()],
    });

    await db.execute({
      sql: "DELETE FROM verification_codes WHERE email = ? AND type = 'reset'",
      args: [email.toLowerCase()],
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[ResetPassword]', err);
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}
