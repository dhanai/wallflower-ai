'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Menu } from '@base-ui-components/react/menu';
import { createClient as createSupabaseClient } from '@/lib/supabase/client';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [expanded, setExpanded] = useState<boolean>(true);
  const [userName, setUserName] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userAvatar, setUserAvatar] = useState<string | null>(null);

  // Persist sidebar state between reloads
  useEffect(() => {
    const saved = typeof window !== 'undefined' ? window.localStorage.getItem('sidebar-expanded') : null;
    if (saved !== null) setExpanded(saved === 'true');
  }, []);
  useEffect(() => {
    if (typeof window !== 'undefined') window.localStorage.setItem('sidebar-expanded', String(expanded));
  }, [expanded]);

  // Load user info from Supabase (Google profile if available)
  useEffect(() => {
    const supabase = createSupabaseClient();
    supabase.auth.getUser().then(({ data }) => {
      const u = data?.user;
      if (!u) return;
      const meta = (u as any).user_metadata || {};
      const picture = meta.picture || meta.avatar_url || null;
      const name = meta.name || meta.full_name || u.email?.split('@')[0] || null;
      setUserName(name);
      setUserEmail(u.email ?? null);
      setUserAvatar(picture);
    }).catch(() => {});
  }, []);

  const handleSignOut = async () => {
    const supabase = createSupabaseClient();
    try {
      await supabase.auth.signOut();
    } finally {
      window.location.href = '/auth/signin';
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f5f7] text-[#1d1d1f]">
      <div className="flex min-h-screen">
        {/* Sidebar */}
        <aside className={`${expanded ? 'w-60' : 'w-16'} bg-[#1d1d1f] text-white transition-[width] duration-200 ease-in-out flex flex-col py-4`}
          aria-label="App navigation">
          <div className="px-3 flex items-center gap-2 mb-4">
            <button onClick={() => setExpanded((v) => !v)} className="w-9 h-9 rounded-lg hover:bg-white/10 flex items-center justify-center" title={expanded ? 'Collapse' : 'Expand'}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="w-5 h-5" fill="currentColor"><path d="M320 64C185.3 64 76.8 172.5 76.8 307.2S185.3 550.4 320 550.4 563.2 441.9 563.2 307.2 454.7 64 320 64z"/></svg>
            </button>
            {expanded && <span className="font-semibold tracking-tight">wallflower.ai</span>}
          </div>

          <nav className="mt-2 flex-1 flex flex-col gap-1">
            <Link href="/editor" className="px-3 py-2 hover:bg-white/10 flex items-center gap-3">
              <span className="inline-flex w-8 justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="w-5 h-5" fill="currentColor"><path d="M96 128h448v384H96z"/></svg>
              </span>
              {expanded && <span>Editor</span>}
            </Link>
            <Link href="/designs" className="px-3 py-2 hover:bg-white/10 flex items-center gap-3">
              <span className="inline-flex w-8 justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="w-5 h-5" fill="currentColor"><path d="M320 96l192 160H128L320 96zM128 288h384v192H128V288z"/></svg>
              </span>
              {expanded && <span>Designs</span>}
            </Link>
          </nav>

          {/* Bottom account section with drop-up menu */}
          <div className="mt-auto px-2 pt-2">
            <Menu.Root>
              <Menu.Trigger className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-white/10">
                <span className="inline-flex w-8 h-8 rounded-full overflow-hidden bg-white/20 items-center justify-center">
                  {userAvatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={userAvatar} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="w-4 h-4" fill="currentColor"><path d="M320 352c88.4 0 160-71.6 160-160S408.4 32 320 32 160 103.6 160 192s71.6 160 160 160zm0 64C194.4 416 64 470.5 64 544c0 35.3 28.7 64 64 64H512c35.3 0 64-28.7 64-64c0-73.5-130.4-128-256-128z"/></svg>
                  )}
                </span>
                {expanded && (
                  <span className="flex-1 min-w-0 flex flex-col text-left">
                    <span className="text-sm leading-tight truncate">{userName ?? 'Account'}</span>
                    <span className="text-[11px] text-white/60 leading-tight truncate">{userEmail ?? ''}</span>
                  </span>
                )}
                <span className="ml-auto text-white/60">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="w-3.5 h-3.5" fill="currentColor"><path d="M320 392L192 264h256L320 392z"/></svg>
                </span>
              </Menu.Trigger>
              <Menu.Portal>
                <Menu.Positioner side="top" align="start" sideOffset={8}>
                  <Menu.Popup className="bg-[#111111] text-white border border-white/10 rounded-lg shadow-xl py-1.5 min-w-[180px]">
                    <Menu.Item asChild>
                      <Link href="/account" className="block px-3 py-1.5 text-[13px] hover:bg-white/10">Account</Link>
                    </Menu.Item>
                    <Menu.Separator className="my-1 h-px bg-white/10" />
                    <Menu.Item onClick={handleSignOut} className="px-3 py-1.5 text-[13px] hover:bg-white/10 cursor-pointer">Sign out</Menu.Item>
                  </Menu.Popup>
                </Menu.Positioner>
              </Menu.Portal>
            </Menu.Root>
            {expanded && <div className="text-[10px] text-white/40 px-2 py-1">© 2025</div>}
          </div>
        </aside>

        {/* Content */}
        <main className="flex-1 min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}


