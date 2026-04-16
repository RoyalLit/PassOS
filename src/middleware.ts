import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Protect /superadmin/* routes - redirect unauthorized to landing
  if (pathname.startsWith('/superadmin')) {
    const response = NextResponse.next({ request });

    // Step 1: Use the anon-key SSR client with cookie forwarding to validate the
    // session JWT. Service-role clients bypass JWT verification — they cannot
    // read session cookies and will return null even for valid superadmin sessions.
    const anonClient = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    const { data: { user } } = await anonClient.auth.getUser();

    if (!user) {
      return NextResponse.redirect(new URL('/', request.url));
    }

    // Step 2: Now that we have a verified user, use the service-role client
    // ONLY for the DB query so it bypasses RLS and reads the canonical role.
    // NEVER trust user_metadata.role — it is user-writable.
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { data: profile } = await adminClient
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'superadmin') {
      return NextResponse.redirect(new URL('/', request.url));
    }

    return response;
  }

  return await updateSession(request);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
