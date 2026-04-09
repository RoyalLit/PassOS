import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { UserRole } from '@/types';
import { canAccessRoute, getRoleDashboardPath } from '@/lib/auth/routes';

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

  const publicRoutes = ['/login', '/approve', '/signup', '/admin-login'];
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

  if (user && isPublicRoute) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    const userRole: UserRole = (profile?.role as UserRole) ||
      (user.user_metadata?.role as UserRole) || 'student';

    if (pathname === '/admin-login') {
      if (userRole !== 'superadmin') {
        const url = request.nextUrl.clone();
        url.pathname = '/';
        const response = NextResponse.redirect(url);
        supabaseResponse.cookies.getAll().forEach(cookie => {
          const { name, value, ...options } = cookie;
          response.cookies.set(name, value, options);
        });
        return response;
      }
    } else {
      const url = request.nextUrl.clone();
      url.pathname = getRoleDashboardPath(userRole);
      const response = NextResponse.redirect(url);
      supabaseResponse.cookies.getAll().forEach(cookie => {
        const { name, value, ...options } = cookie;
        response.cookies.set(name, value, options);
      });
      return response;
    }
  }

  let userRole: UserRole = (user?.user_metadata?.role as UserRole) || 'student';

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role) {
      userRole = profile.role as UserRole;
    }
  }

  if (user) {
    if (!canAccessRoute(userRole, pathname)) {
      const url = request.nextUrl.clone();
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
