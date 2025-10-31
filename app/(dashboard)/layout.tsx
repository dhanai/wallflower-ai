import { createClient } from '@/lib/supabase/server';
import DashboardSidebar from '@/components/DashboardSidebar';

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
  let userRole: string | null = null;
  if (user) {
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();
    userRole = userData?.role || null;
  }

  return (
    <div className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f]">
      <DashboardSidebar
        initialUserName={userName}
        initialUserEmail={userEmail}
        initialUserAvatar={userAvatar}
        initialUserRole={userRole}
      />
      <main className="min-h-screen transition-[margin-left] duration-200 ease-in-out ml-60">
        {children}
      </main>
    </div>
  );
}


