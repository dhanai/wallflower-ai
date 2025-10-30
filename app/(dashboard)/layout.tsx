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

  return (
    <div className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f]">
      <div className="flex min-h-screen">
        <DashboardSidebar
          initialUserName={userName}
          initialUserEmail={userEmail}
          initialUserAvatar={userAvatar}
        />
        <main className="flex-1 min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}


