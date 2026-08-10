import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function POST(request: Request) {
  try {
    let body: { email?: string; password?: string };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    // Parse incoming cookies from the request header so the Supabase client
    // can see any existing session (e.g. to clear stale auth tokens on login).
    const cookieHeader = request.headers.get('cookie') || '';

    // Build a response that will capture Set-Cookie headers set by
    // the Supabase client during signInWithPassword.  We use a plain
    // NextResponse as a "cookie bucket" and then marry it with the
    // final JSON response so the browser actually receives the auth
    // session cookies.
    const cookieBucket = NextResponse.next();

    // Accumulate every cookie Supabase sets so we can attach them to the
    // final response.  We ALSO set them on cookieBucket so that any
    // subsequent Supabase call within this handler (e.g. profile fetch)
    // sees the updated auth cookies.
    const capturedCookies: { name: string; value: string; options: Record<string, unknown> }[] = [];

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            // Merge cookies from the incoming request header with any
            // cookies that were already set on cookieBucket during this
            // handler's lifetime (so later Supabase calls see the auth
            // cookies that signInWithPassword just created).
            const merged: { name: string; value: string }[] = [];
            const seen = new Set<string>();

            // Start with cookies already set on cookieBucket
            cookieBucket.cookies.getAll().forEach((c) => {
              merged.push({ name: c.name, value: c.value });
              seen.add(c.name);
            });

            // Then add request cookies that haven't been overridden
            if (cookieHeader) {
              cookieHeader.split('; ').forEach((c) => {
                const eqIdx = c.indexOf('=');
                const name = eqIdx === -1 ? c.trim() : c.substring(0, eqIdx).trim();
                if (!seen.has(name)) {
                  merged.push({
                    name,
                    value: eqIdx === -1 ? '' : c.substring(eqIdx + 1),
                  });
                }
              });
            }

            return merged;
          },
          setAll(cookiesToSet) {
            // Accumulate for final response & mirror to cookieBucket so
            // subsequent supabase calls within this handler see them.
            capturedCookies.push(...(cookiesToSet as typeof capturedCookies));
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieBucket.cookies.set(name, value, options);
            });
          },
        },
      },
    );

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    // Guard against null user (should not happen when error is null, but be safe)
    if (!data.user) {
      console.error('[api/auth/login] signInWithPassword succeeded but user is null');
      return NextResponse.json({ error: 'Authentication failed — no user returned' }, { status: 500 });
    }

    // Fetch user profile to get role and client_id
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, client_id')
      .eq('id', data.user.id)
      .maybeSingle();

    if (profileError) {
      console.error('[api/auth/login] Profile fetch error:', profileError);
    }

    const role = profile?.role || 'editor';
    const client_id = profile?.client_id ?? undefined;

    // Determine redirect based on role
    const redirectMap: Record<string, string> = {
      admin: '/dashboard',
      project_manager: '/dashboard',
      qc: '/qc',
      editor: '/editor/tasks',
      client: '/calendar',
    };

    const redirect = redirectMap[role as string] || '/dashboard';

    // Build the final JSON response …
    const finalResponse = NextResponse.json({
      user: {
        id: data.user.id,
        email: data.user.email,
        role,
        client_id,
      },
      redirect,
    });

    // … and attach every auth cookie that Supabase set during sign-in so
    // the browser stores the session.  Without this the middleware on the
    // next navigation sees an unauthenticated request and bounces back
    // to /login.
    capturedCookies.forEach(({ name, value, options }) => {
      finalResponse.cookies.set(name, value, options as never);
    });

    return finalResponse;
  } catch (err) {
    // Last-resort catch — ensures JSON even if something unexpected throws
    console.error('[api/auth/login] Unhandled error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
