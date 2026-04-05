import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

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

  // Public routes that don't need auth
  const publicRoutes = ['/login', '/signup', '/approve'];
  const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route));

  if (!user && !isPublicRoute && pathname !== '/') {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    // Create a new redirect response but include any rotated cookies from Supabase
    const response = NextResponse.redirect(url);
    supabaseResponse.cookies.getAll().forEach(cookie => {
      const { name, value, ...options } = cookie;
      response.cookies.set(name, value, options as any);
    });
    return response;
  }

  // If on login/signup and already has a user, redirect to dashboard
  if (user && isPublicRoute && (pathname === '/login' || pathname === '/signup')) {
    const userRole = user.user_metadata?.role || 'student';
    const { getRoleDashboardPath } = await import('@/lib/auth/routes');
    const url = request.nextUrl.clone();
    url.pathname = getRoleDashboardPath(userRole as any);
    const response = NextResponse.redirect(url);
    supabaseResponse.cookies.getAll().forEach(cookie => {
      const { name, value, ...options } = cookie;
      response.cookies.set(name, value, options as any);
    });
    return response;
  }

  // Also handle unauthorized access to specific role areas
  if (user) {
    const userRole = user.user_metadata?.role || 'student';
    const { canAccessRoute } = await import('@/lib/auth/routes');
    
    if (!canAccessRoute(userRole as any, pathname)) {
      const url = request.nextUrl.clone();
      const { getRoleDashboardPath } = await import('@/lib/auth/routes');
      url.pathname = getRoleDashboardPath(userRole as any);
      const response = NextResponse.redirect(url);
      supabaseResponse.cookies.getAll().forEach(cookie => {
        const { name, value, ...options } = cookie;
        response.cookies.set(name, value, options as any);
      });
      return response;
    }
  }

  return supabaseResponse;
}
