interface Entry { count: number; resetAt: number; }

const store = new Map<string, Entry>();

/**
 * Verifica rate limit em memória.
 * ok=false → bloqueado, retryAfter = segundos até liberar.
 */
export function rateLimitCheck(
  key: string,
  limit: number,
  windowMs: number,
): { ok: boolean; retryAfter: number } {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, retryAfter: 0 };
  }

  if (entry.count >= limit) {
    return { ok: false, retryAfter: Math.ceil((entry.resetAt - now) / 1000) };
  }

  entry.count++;
  return { ok: true, retryAfter: 0 };
}

/** Extrai IP real do request (funciona em Vercel). */
export function getIp(req: Request): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown'
  );
}

/** Resposta padronizada de rate limit (429). */
export function rateLimitResponse(retryAfter: number): Response {
  return new Response(
    JSON.stringify({ error: `Muitas tentativas. Tente novamente em ${retryAfter}s.` }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(retryAfter),
      },
    },
  );
}
