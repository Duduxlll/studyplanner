import { auth } from '@/auth';
import { NextResponse } from 'next/server';

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isLoginPage = req.nextUrl.pathname === '/login';
  const isApiRoute = req.nextUrl.pathname.startsWith('/api');

  // Redireciona para /login se não autenticado (apenas pages, não API routes)
  if (!isLoggedIn && !isLoginPage && !isApiRoute) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // Redireciona para / se já logado e tentar acessar /login
  if (isLoggedIn && isLoginPage) {
    return NextResponse.redirect(new URL('/', req.url));
  }
});

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
