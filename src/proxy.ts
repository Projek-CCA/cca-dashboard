import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

const protectedRoutes = ['/dashboard', '/internal', '/editor', '/qc'];
const publicRoutes = ['/auth/login', '/auth/callback', '/auth/confirm', '/auth/logout', '/auth/signup', '/auth/reset-password', '/login', '/_next', '/api/auth'];

function isProtected(pathname: string) {
  if (publicRoutes.some((route) => pathname.startsWith(route))) return false;
  // Allow /calendar, /review for non-authenticated (client) access
  if (pathname.startsWith('/calendar') || pathname.startsWith('/review') || pathname.startsWith('/api/reviews')) return false;
  return true;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Root always redirects: signed-in users go to their dashboard,
  // everyone else goes to login.
  if (pathname === '/') {
    const { user } = await updateSession(request);
    const url = request.nextUrl.clone();
    url.pathname = user ? '/dashboard' : '/login';
    return NextResponse.redirect(url);
  }

  if (!isProtected(pathname)) {
    return NextResponse.next();
  }

  const { supabaseResponse, user } = await updateSession(request);

  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirect', pathname);
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    // Skip static files and internal Next.js paths
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
