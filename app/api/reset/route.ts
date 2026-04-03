import { NextResponse } from 'next/server';
import { ensureInit } from '@/lib/db';
import { auth } from '@/auth';

export const runtime = 'nodejs';

export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const db = await ensureInit();
  const userId = session.user.id;

  // Pega os IDs dos planos do usuário
  const plansResult = await db.execute({
    sql: 'SELECT id FROM plans WHERE user_id = ?',
    args: [userId],
  });

  const planIds = plansResult.rows.map((r) => Number(r.id));

  if (planIds.length > 0) {
    // Deleta vídeos dos planos do usuário
    await db.execute({
      sql: `DELETE FROM plan_videos WHERE plan_id IN (${planIds.map(() => '?').join(',')})`,
      args: planIds,
    });

    // Deleta os planos
    await db.execute({
      sql: `DELETE FROM plans WHERE user_id = ?`,
      args: [userId],
    });
  }

  return NextResponse.json({ ok: true, message: 'Todos os planos e histórico apagados.' });
}
