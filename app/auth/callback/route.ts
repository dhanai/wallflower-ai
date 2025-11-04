import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  let response = NextResponse.redirect(new URL('/editor', request.url));

  const supabase = createServerClient(supabaseUrl, supabaseAnon, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value));
        response = NextResponse.redirect(new URL('/editor', request.url));
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  if (code) {
    await supabase.auth.exchangeCodeForSession(code);
    
    // Ensure user exists in public.users table after OAuth sign-in
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      try {
        // Check if user already exists
        const { data: existingUser } = await supabase
          .from('users')
          .select('id')
          .eq('id', user.id)
          .single();

        if (!existingUser) {
          // Create user in public.users table
          const { error: userError } = await supabase
            .from('users')
            .insert({
              id: user.id,
              email: user.email || null,
              full_name: user.user_metadata?.full_name || user.user_metadata?.name || null,
              avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
            });

          if (userError) {
            console.error('Error creating user in public.users:', userError);
            // Continue anyway - might be a constraint issue or race condition
          } else {
            console.log('Created user in public.users:', user.id);
          }
        }
      } catch (error) {
        console.error('Error checking/creating user:', error);
        // Continue anyway - user creation will happen on first API call if needed
      }
    }
  }

  return response;
}


