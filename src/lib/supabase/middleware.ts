import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function updateSession(request: NextRequest) {
  const supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh the session if the JWT is expired, but don't block on getUser().
  // The server component that actually needs the user will call getUser() itself.
  // This middleware only ensures the refresh token cookie is updated.
  const { error } = await supabase.auth.getUser();

  if (error) {
    // Session is invalid/expired — let the calling page handle auth.
    // No need to call refreshSession() here; the server component
    // will detect the missing session and redirect to login.
  }

  return supabaseResponse;
}
