import { NextRequest, NextResponse } from 'next/server';
import { ensureInit } from '@/lib/db';
import { sendVerificationCode } from '@/lib/email';

export const runtime = 'nodejs';

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function POST(req: NextRequest) {
  try {
    const { email, type } = await req.json() as {
      email: string;
      type: 'register' | 'reset';
    };

    if (!email || !type) {
      return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 });
    }

    const db = await ensureInit();

    if (type === 'reset') {
      // Verifica se o email existe e está verificado
      const user = await db.execute({
        sql: 'SELECT id FROM users WHERE email = ? AND email_verified = 1',
        args: [email.toLowerCase()],
      });
      if (user.rows.length === 0) {
        // Retorna ok mesmo sem encontrar (segurança: não revelar se email existe)
        return NextResponse.json({ ok: true });
      }
    }

    const code = generateCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    await db.execute({
      sql: 'DELETE FROM verification_codes WHERE email = ? AND type = ?',
      args: [email.toLowerCase(), type],
    });
    await db.execute({
      sql: 'INSERT INTO verification_codes (email, code, type, expires_at) VALUES (?, ?, ?, ?)',
      args: [email.toLowerCase(), code, type, expiresAt],
    });

    await sendVerificationCode(email.toLowerCase(), code, type);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[SendCode]', err);
    return NextResponse.json({ error: 'Erro ao enviar código. Tente novamente.' }, { status: 500 });
  }
}
