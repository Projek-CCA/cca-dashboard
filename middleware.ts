import { NextResponse, type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

const protectedRoutes = ['/dashboard', '/internal', '/editor', '/qc'];
const publicRoutes = ['/login', '/forgot-password', '/auth/reset-password', '/_next', '/api/auth'];

function isProtected(pathname: string) {
  if (publicRoutes.some((route) => pathname.startsWith(route))) return false;
  // Allow /calendar, /review and the home page for non-authenticated (client) access
  if (pathname === '/' || pathname.startsWith('/calendar') || pathname.startsWith('/review') || pathname.startsWith('/api/reviews')) return false;
  return true;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

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
