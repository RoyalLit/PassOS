import { type NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import { createClient } from '@supabase/supabase-js';

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Protect /superadmin/* routes - redirect unauthorized to landing
  if (pathname.startsWith('/superadmin')) {
    const response = NextResponse.next({ request });

    // Use service-role client so the profiles query is never blocked by RLS.
    // NEVER trust user_metadata.role as a fallback — it is user-writable.
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: { autoRefreshToken: false, persistSession: false },
        global: {
          headers: {
            // Forward the session cookie so auth.getUser() resolves the JWT
            cookie: request.headers.get('cookie') ?? '',
          },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(new URL('/', request.url));
    }

    // Read the canonical role from the database only — never trust user_metadata
    const { data: profile } = await supabase
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
