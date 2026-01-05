import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value));
          response = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Get session from request cookies
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Protect /admin routes - require court_officer role
  if (request.nextUrl.pathname.startsWith('/admin')) {
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    // Check for court_officer role
    const { data: staffRole } = await supabase
      .from('staff_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (!staffRole || staffRole.role !== 'court_officer') {
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }
  }

  // Protect /cashier routes - require cashier role
  if (request.nextUrl.pathname.startsWith('/cashier')) {
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    // Check for cashier role
    const { data: staffRole } = await supabase
      .from('staff_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (!staffRole || staffRole.role !== 'cashier') {
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }
  }

  return response;
}

export const config = {
  matcher: ['/admin/:path*', '/cashier/:path*'],
};
