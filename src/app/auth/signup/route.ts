import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const { email, password, name, role } = await request.json();

    if (!email || !password || !name || !role) {
      return NextResponse.json({ error: 'email, password, name, and role are required' }, { status: 400 });
    }

    const validRoles = ['admin', 'project_manager', 'qc', 'editor'];
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: 'Invalid role. Must be: admin, project_manager, qc, or editor' }, { status: 400 });
    }

    const supabase = await createClient();

    // Check if requesting user is admin (caller must be authenticated)
    const { data: { user: caller } } = await supabase.auth.getUser();
    if (!caller) {
      return NextResponse.json({ error: 'Unauthorized — must be logged in as admin' }, { status: 401 });
    }

    const { data: callerProfile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', caller.id)
      .maybeSingle();

    if (callerProfile?.role !== 'admin') {
      return NextResponse.json({ error: 'Only admins can create users' }, { status: 403 });
    }

    // Create the user via Supabase Auth Admin API
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    // Create profile record
    const { error: profileError } = await supabase.from('profiles').insert({
      id: authData.user.id,
      name,
      email,
      role,
      avatar_initials: name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2),
    });

    if (profileError) {
      // Rollback auth user creation on profile failure
      await supabase.auth.admin.deleteUser(authData.user.id);
      return NextResponse.json({ error: `Profile creation failed: ${profileError.message}` }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      user: {
        id: authData.user.id,
        email: authData.user.email,
        name,
        role,
      },
    });
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
}
