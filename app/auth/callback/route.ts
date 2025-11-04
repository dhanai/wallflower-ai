import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@/lib/supabase/server';

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
    // Use createClient from server.ts to ensure proper RLS context
    const serverSupabase = await createClient();
    const { data: { user } } = await serverSupabase.auth.getUser();
    
    if (user) {
      try {
        // Check if user already exists
        const { data: existingUser, error: checkError } = await serverSupabase
          .from('users')
          .select('id')
          .eq('id', user.id)
          .single();

        if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
          console.error('Error checking user:', checkError);
        }

        if (!existingUser) {
          // Create user in public.users table
          const { data: newUser, error: userError } = await serverSupabase
            .from('users')
            .insert({
              id: user.id,
              email: user.email || null,
              full_name: user.user_metadata?.full_name || user.user_metadata?.name || null,
              avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
            })
            .select()
            .single();

          if (userError) {
            console.error('Error creating user in public.users:', userError);
            console.error('User ID:', user.id);
            console.error('User email:', user.email);
            // Continue anyway - user creation will happen on first API call if needed
          } else {
            console.log('Successfully created user in public.users:', newUser?.id);
          }
        } else {
          console.log('User already exists in public.users:', existingUser.id);
        }
      } catch (error) {
        console.error('Error checking/creating user:', error);
        // Continue anyway - user creation will happen on first API call if needed
      }
    }
  }

  return response;
}


