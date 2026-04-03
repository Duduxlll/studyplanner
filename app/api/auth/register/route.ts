import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { ensureInit } from '@/lib/db';
import { sendVerificationCode } from '@/lib/email';

export const runtime = 'nodejs';

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function POST(req: NextRequest) {
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

    // Verifica se email já está em uso por conta verificada
    const existing = await db.execute({
      sql: 'SELECT id, email_verified FROM users WHERE email = ?',
      args: [email.toLowerCase()],
    });

    if (existing.rows.length > 0) {
      const user = existing.rows[0] as unknown as { email_verified: number };
      if (user.email_verified) {
        return NextResponse.json({ error: 'Este email já está cadastrado.' }, { status: 409 });
      }
      // Conta não verificada — atualiza e reenvia código
      const hash = await bcrypt.hash(password, 12);
      await db.execute({
        sql: 'UPDATE users SET name = ?, password_hash = ? WHERE email = ?',
        args: [name.trim(), hash, email.toLowerCase()],
      });
    } else {
      const hash = await bcrypt.hash(password, 12);
      const id = crypto.randomUUID();
      await db.execute({
        sql: 'INSERT INTO users (id, email, name, password_hash, email_verified) VALUES (?, ?, ?, ?, 0)',
        args: [id, email.toLowerCase(), name.trim(), hash],
      });
    }

    // Apaga códigos antigos e gera novo
    const code = generateCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    await db.execute({
      sql: "DELETE FROM verification_codes WHERE email = ? AND type = 'register'",
      args: [email.toLowerCase()],
    });
    await db.execute({
      sql: "INSERT INTO verification_codes (email, code, type, expires_at) VALUES (?, ?, 'register', ?)",
      args: [email.toLowerCase(), code, expiresAt],
    });

    await sendVerificationCode(email.toLowerCase(), code, 'register');

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[Register]', err);
    return NextResponse.json({ error: 'Erro interno. Tente novamente.' }, { status: 500 });
  }
}
