'use client';

import DashboardSidebar from '@/components/DashboardSidebar';
import { MobileMenuProvider, useMobileMenu } from '@/contexts/MobileMenuContext';

interface DashboardLayoutClientProps {
  initialUserName?: string | null;
  initialUserEmail?: string | null;
  initialUserAvatar?: string | null;
  initialUserRole?: string | null;
  children: React.ReactNode;
}

function DashboardLayoutContent({
  initialUserName,
  initialUserEmail,
  initialUserAvatar,
  initialUserRole,
  children,
}: DashboardLayoutClientProps) {
  const { mobileOpen, openMenu, closeMenu } = useMobileMenu();

  return (
    <div className="h-screen bg-[#f5f5f7] text-[#1d1d1f] overflow-hidden flex">
      <DashboardSidebar
        initialUserName={initialUserName}
        initialUserEmail={initialUserEmail}
        initialUserAvatar={initialUserAvatar}
        initialUserRole={initialUserRole}
        mobileOpen={mobileOpen}
        onMobileClose={closeMenu}
      />
      <main className="flex-1 transition-[margin-left] duration-200 ease-in-out md:ml-60 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}

export default function DashboardLayoutClient(props: DashboardLayoutClientProps) {
  return (
    <MobileMenuProvider>
      <DashboardLayoutContent {...props} />
    </MobileMenuProvider>
  );
}

