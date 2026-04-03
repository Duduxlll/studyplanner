import { auth } from '@/auth';
import { NextResponse } from 'next/server';

const AUTH_PAGES = ['/login', '/register', '/verify', '/forgot-password', '/reset-password'];
const PUBLIC_PAGES = ['/']; // acessíveis sem login (landing page)

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isAuthPage = AUTH_PAGES.includes(req.nextUrl.pathname);
  const isPublicPage = PUBLIC_PAGES.includes(req.nextUrl.pathname);
  const isApiRoute = req.nextUrl.pathname.startsWith('/api');

  if (!isLoggedIn && !isAuthPage && !isPublicPage && !isApiRoute) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  if (isLoggedIn && isAuthPage) {
    return NextResponse.redirect(new URL('/', req.url));
  }
});

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
