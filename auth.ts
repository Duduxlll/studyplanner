import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import type { DefaultSession } from 'next-auth';
import { ensureInit } from '@/lib/db';

declare module 'next-auth' {
  interface Session {
    user: { id: string } & DefaultSession['user'];
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    Credentials({
      credentials: {
        email: { label: 'Email' },
        password: { label: 'Senha', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const db = await ensureInit();
        const result = await db.execute({
          sql: 'SELECT id, email, name, password_hash FROM users WHERE email = ? AND email_verified = 1',
          args: [(credentials.email as string).toLowerCase()],
        });

        const user = result.rows[0] as unknown as {
          id: string; email: string; name: string; password_hash: string;
        } | undefined;

        if (!user?.password_hash) return null;

        const valid = await bcrypt.compare(credentials.password as string, user.password_hash);
        if (!valid) return null;

        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
  session: { strategy: 'jwt' },
  callbacks: {
    /**
     * jwt — só recebe `user` e `account` no PRIMEIRO login da sessão.
     * Aproveita para:
     *  1. Verificar se já existe uma conta com o mesmo e-mail (vincular)
     *  2. Criar registro na tabela `users` para logins via Google
     */
    async jwt({ token, user, account }) {
      if (account?.provider === 'google' && user?.email) {
        const db = await ensureInit();
        const email = user.email.toLowerCase();

        // Verifica se já existe conta com este e-mail
        const existing = await db.execute({
          sql: 'SELECT id FROM users WHERE email = ?',
          args: [email],
        });

        if (existing.rows.length > 0) {
          // Vincula ao ID existente (conta email/senha ou Google anterior)
          const existingId = (existing.rows[0] as unknown as { id: string }).id;
          token.sub = existingId;
          // Garante que está verificado e atualiza nome se estava vazio
          await db.execute({
            sql: `UPDATE users SET email_verified = 1,
                    name = CASE WHEN (name IS NULL OR name = '') THEN ? ELSE name END
                  WHERE id = ?`,
            args: [user.name ?? '', existingId],
          });
        } else {
          // Novo usuário Google — cria registro no banco
          const userId = token.sub ?? crypto.randomUUID();
          await db.execute({
            sql: 'INSERT OR IGNORE INTO users (id, email, name, email_verified) VALUES (?, ?, ?, 1)',
            args: [userId, email, user.name ?? ''],
          });
          token.sub = userId;
        }
      }
      return token;
    },

    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
});
