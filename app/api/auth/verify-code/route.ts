import { NextRequest, NextResponse } from 'next/server';
import { ensureInit } from '@/lib/db';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { email, code, type } = await req.json() as {
      email: string;
      code: string;
      type: 'register' | 'reset';
    };

    if (!email || !code || !type) {
      return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 });
    }

    const db = await ensureInit();

    const result = await db.execute({
      sql: 'SELECT * FROM verification_codes WHERE email = ? AND code = ? AND type = ?',
      args: [email.toLowerCase(), code.trim(), type],
    });

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Código inválido.' }, { status: 400 });
    }

    const row = result.rows[0] as unknown as { expires_at: string };
    if (new Date(row.expires_at) < new Date()) {
      return NextResponse.json({ error: 'Código expirado. Solicite um novo.' }, { status: 400 });
    }

    if (type === 'register') {
      await db.execute({
        sql: 'UPDATE users SET email_verified = 1 WHERE email = ?',
        args: [email.toLowerCase()],
      });
    }

    // Não apaga o código de 'reset' aqui — apaga só ao trocar a senha
    if (type === 'register') {
      await db.execute({
        sql: "DELETE FROM verification_codes WHERE email = ? AND type = 'register'",
        args: [email.toLowerCase()],
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[VerifyCode]', err);
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}
