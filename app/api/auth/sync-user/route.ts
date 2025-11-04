import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * Utility endpoint to sync the current authenticated user to the public.users table.
 * Useful for existing users who signed in before auto-creation was implemented.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Check if user already exists
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id, email, full_name, avatar_url')
      .eq('id', user.id)
      .single();

    if (existingUser) {
      // User exists - optionally update metadata if it changed
      const { error: updateError } = await supabase
        .from('users')
        .update({
          email: user.email || existingUser.email,
          full_name: user.user_metadata?.full_name || user.user_metadata?.name || existingUser.full_name,
          avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || existingUser.avatar_url,
        })
        .eq('id', user.id);

      if (updateError) {
        console.error('Error updating user:', updateError);
        return NextResponse.json({ 
          success: true, 
          message: 'User already exists',
          user: existingUser,
          warning: 'Could not update user metadata'
        });
      }

      return NextResponse.json({ 
        success: true, 
        message: 'User already exists and was updated',
        user: { ...existingUser, email: user.email || existingUser.email }
      });
    }

    // Create user in public.users table
    const { data: newUser, error: createError } = await supabase
      .from('users')
      .insert({
        id: user.id,
        email: user.email || null,
        full_name: user.user_metadata?.full_name || user.user_metadata?.name || null,
        avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating user:', createError);
      return NextResponse.json({ 
        error: createError.message || 'Failed to create user record' 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      message: 'User created successfully',
      user: newUser
    });
  } catch (error: any) {
    console.error('Error in sync-user API:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to sync user' 
    }, { status: 500 });
  }
}

