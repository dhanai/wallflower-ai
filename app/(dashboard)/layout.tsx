import { createClient } from '@/lib/supabase/server';
import DashboardLayoutClient from '@/components/DashboardLayoutClient';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Fetch user data server-side to avoid hydration issues
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  // Extract user metadata
  const meta = user?.user_metadata || {};
  const userName = meta.name || meta.full_name || user?.email?.split('@')[0] || null;
  const userEmail = user?.email ?? null;
  const userAvatar = meta.picture || meta.avatar_url || null;

  // Fetch user role from public.users table
  // Also ensure user exists in public.users table (create if missing)
  let userRole: string | null = null;
  if (user) {
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();
    
    // If user doesn't exist in public.users table, create them
    if (userError && userError.code === 'PGRST116') { // PGRST116 = no rows returned
      try {
        const { data: newUser, error: createError } = await supabase
          .from('users')
          .insert({
            id: user.id,
            email: user.email || null,
            full_name: user.user_metadata?.full_name || user.user_metadata?.name || null,
            avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
          })
          .select('id, role')
          .single();

        if (createError) {
          console.error('Error creating user in dashboard layout:', createError);
        } else {
          console.log('Auto-created user in dashboard layout:', newUser?.id || user.id);
          userRole = newUser?.role || null;
        }
      } catch (error) {
        console.error('Error in user creation:', error);
        // Continue - user will be created on next API call if needed
      }
    } else if (userData) {
      userRole = userData.role || null;
    }
  }

  return (
    <DashboardLayoutClient
      initialUserName={userName}
      initialUserEmail={userEmail}
      initialUserAvatar={userAvatar}
      initialUserRole={userRole}
    >
      {children}
    </DashboardLayoutClient>
  );
}


