import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, fullName } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName || '',
        },
      },
    });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    // Create user profile in public.users table
    if (data.user) {
      try {
        await supabase.from('users').insert({
          id: data.user.id,
          email: data.user.email,
          full_name: fullName || '',
        });
      } catch (dbError: any) {
        // Log but don't fail sign-up if user creation fails (might already exist)
        console.error('Error creating user profile:', dbError);
      }
    }

    return NextResponse.json({ 
      success: true,
      user: data.user 
    });
  } catch (error: any) {
    console.error('Sign up error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to sign up' },
      { status: 500 }
    );
  }
}

