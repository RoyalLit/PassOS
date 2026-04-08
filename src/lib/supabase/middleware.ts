import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { UserRole } from '@/types';

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  const publicRoutes = ['/login', '/signup', '/approve'];
  const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route));

  if (!user && !isPublicRoute && pathname !== '/') {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    const response = NextResponse.redirect(url);
    supabaseResponse.cookies.getAll().forEach(cookie => {
      const { name, value, ...options } = cookie;
      response.cookies.set(name, value, options);
    });
    return response;
  }

  if (user && isPublicRoute && (pathname === '/login' || pathname === '/signup')) {
    const userRole = (user.user_metadata?.role as UserRole) || 'student';
    const { getRoleDashboardPath } = await import('@/lib/auth/routes');
    const url = request.nextUrl.clone();
    url.pathname = getRoleDashboardPath(userRole);
    const response = NextResponse.redirect(url);
    supabaseResponse.cookies.getAll().forEach(cookie => {
      const { name, value, ...options } = cookie;
      response.cookies.set(name, value, options);
    });
    return response;
  }

  if (user) {
    const userRole = (user.user_metadata?.role as UserRole) || 'student';
    const { canAccessRoute } = await import('@/lib/auth/routes');
    
    if (!canAccessRoute(userRole, pathname)) {
      const url = request.nextUrl.clone();
      const { getRoleDashboardPath } = await import('@/lib/auth/routes');
      url.pathname = getRoleDashboardPath(userRole);
      const response = NextResponse.redirect(url);
      supabaseResponse.cookies.getAll().forEach(cookie => {
        const { name, value, ...options } = cookie;
        response.cookies.set(name, value, options);
      });
      return response;
    }
  }

  return supabaseResponse;
}
