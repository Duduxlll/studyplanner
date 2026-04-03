import { auth } from '@/auth';
import { NextResponse } from 'next/server';

const AUTH_PAGES = ['/login', '/register', '/verify', '/forgot-password', '/reset-password'];

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isAuthPage = AUTH_PAGES.includes(req.nextUrl.pathname);
  const isApiRoute = req.nextUrl.pathname.startsWith('/api');

  // Redireciona para /login se não autenticado (apenas pages, não API routes)
  if (!isLoggedIn && !isAuthPage && !isApiRoute) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // Redireciona para / se já logado e tentar acessar página de auth
  if (isLoggedIn && isAuthPage) {
    return NextResponse.redirect(new URL('/', req.url));
  }
});

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
