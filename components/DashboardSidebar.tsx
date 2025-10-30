'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Menu } from '@base-ui-components/react/menu';
import { createClient } from '@/lib/supabase/client';

interface DashboardSidebarProps {
  initialUserName?: string | null;
  initialUserEmail?: string | null;
  initialUserAvatar?: string | null;
}

export default function DashboardSidebar({ 
  initialUserName, 
  initialUserEmail, 
  initialUserAvatar 
}: DashboardSidebarProps) {
  const [expanded, setExpanded] = useState<boolean>(true);
  const [userName, setUserName] = useState<string | null>(initialUserName ?? null);
  const [userEmail, setUserEmail] = useState<string | null>(initialUserEmail ?? null);
  const [userAvatar, setUserAvatar] = useState<string | null>(initialUserAvatar ?? null);

  // Persist sidebar state between reloads
  useEffect(() => {
    const saved = typeof window !== 'undefined' ? window.localStorage.getItem('sidebar-expanded') : null;
    if (saved !== null) setExpanded(saved === 'true');
  }, []);
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('sidebar-expanded', String(expanded));
    }
  }, [expanded]);

  // Listen to auth state changes to update user data
  useEffect(() => {
    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const u = session?.user;
      if (u) {
        const meta = (u as any).user_metadata || {};
        const picture = meta.picture || meta.avatar_url || null;
        const name = meta.name || meta.full_name || u.email?.split('@')[0] || null;
        const email = u.email ?? null;
        
        setUserName(name);
        setUserEmail(email);
        setUserAvatar(picture);
      } else if (event === 'SIGNED_OUT') {
        setUserName(null);
        setUserEmail(null);
        setUserAvatar(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
    const supabase = createClient();
    try {
      await supabase.auth.signOut();
    } finally {
      window.location.href = '/auth/signin';
    }
  };

  return (
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
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="w-5 h-5" fill="currentColor">
              <path d="M535.6 85.7C513.7 63.8 478.3 63.8 456.4 85.7L432 110.1L529.9 208L554.3 183.6C576.2 161.7 576.2 126.3 554.3 104.4L535.6 85.7zM236.4 305.7C230.3 311.8 225.6 319.3 222.9 327.6L193.3 416.4C190.4 425 192.7 434.5 199.1 441C205.5 447.5 215 449.7 223.7 446.8L312.5 417.2C320.7 414.5 328.2 409.8 334.4 403.7L496 241.9L398.1 144L236.4 305.7zM160 128C107 128 64 171 64 224L64 480C64 533 107 576 160 576L416 576C469 576 512 533 512 480L512 384C512 366.3 497.7 352 480 352C462.3 352 448 366.3 448 384L448 480C448 497.7 433.7 512 416 512L160 512C142.3 512 128 497.7 128 480L128 224C128 206.3 142.3 192 160 192L256 192C273.7 192 288 177.7 288 160C288 142.3 273.7 128 256 128L160 128z"/>
            </svg>
          </span>
          {expanded && <span>Create</span>}
        </Link>
        <Link href="/designs" className="px-3 py-2 hover:bg-white/10 flex items-center gap-3">
          <span className="inline-flex w-8 justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="w-5 h-5" fill="currentColor">
              <path d="M128 160C128 124.7 156.7 96 192 96L512 96C547.3 96 576 124.7 576 160L576 416C576 451.3 547.3 480 512 480L192 480C156.7 480 128 451.3 128 416L128 160zM56 192C69.3 192 80 202.7 80 216L80 512C80 520.8 87.2 528 96 528L456 528C469.3 528 480 538.7 480 552C480 565.3 469.3 576 456 576L96 576C60.7 576 32 547.3 32 512L32 216C32 202.7 42.7 192 56 192zM224 224C241.7 224 256 209.7 256 192C256 174.3 241.7 160 224 160C206.3 160 192 174.3 192 192C192 209.7 206.3 224 224 224zM420.5 235.5C416.1 228.4 408.4 224 400 224C391.6 224 383.9 228.4 379.5 235.5L323.2 327.6L298.7 297C294.1 291.3 287.3 288 280 288C272.7 288 265.8 291.3 261.3 297L197.3 377C191.5 384.2 190.4 394.1 194.4 402.4C198.4 410.7 206.8 416 216 416L488 416C496.7 416 504.7 411.3 508.9 403.7C513.1 396.1 513 386.9 508.4 379.4L420.4 235.4z"/>
            </svg>
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
  );
}

