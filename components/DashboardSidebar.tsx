'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Menu } from '@base-ui-components/react/menu';
import { createClient } from '@/lib/supabase/client';
import { useUserRole, setCachedUserRole } from '@/hooks/useUserRole';

interface DashboardSidebarProps {
  initialUserName?: string | null;
  initialUserEmail?: string | null;
  initialUserAvatar?: string | null;
  initialUserRole?: string | null;
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}

export default function DashboardSidebar({ 
  initialUserName, 
  initialUserEmail, 
  initialUserAvatar,
  initialUserRole,
  mobileOpen: externalMobileOpen,
  onMobileClose
}: DashboardSidebarProps) {
  const [expanded, setExpanded] = useState<boolean>(true);
  const [internalMobileOpen, setInternalMobileOpen] = useState<boolean>(false);
  const mobileOpen = externalMobileOpen !== undefined ? externalMobileOpen : internalMobileOpen;
  const prevPathnameRef = useRef<string | null>(null);
  const [userName, setUserName] = useState<string | null>(initialUserName ?? null);
  const [userEmail, setUserEmail] = useState<string | null>(initialUserEmail ?? null);
  const [userAvatar, setUserAvatar] = useState<string | null>(initialUserAvatar ?? null);
  const { role: userRole, refresh: refreshUserRole } = useUserRole({ initialRole: (initialUserRole as 'admin' | 'user' | null) ?? null });
  const pathname = usePathname();

  // Derive a deterministic color from a string (name/email)
  const getAvatarColor = (seed: string | null): string => {
    const s = seed || '';
    let hash = 0;
    for (let i = 0; i < s.length; i++) {
      hash = s.charCodeAt(i) + ((hash << 5) - hash);
      hash |= 0; // Convert to 32bit integer
    }
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 60%, 45%)`;
  };

  const getAvatarLetter = (name: string | null, email: string | null): string => {
    const source = (name && name.trim()) || (email && email.trim()) || '';
    return source ? source.charAt(0).toUpperCase() : '?';
  };

  // Persist sidebar state between reloads and initialize CSS variable
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = window.localStorage.getItem('sidebar-expanded');
      const initialExpanded = saved !== null ? saved === 'true' : true;
      setExpanded(initialExpanded);
      // Set initial CSS variable
      document.documentElement.style.setProperty('--sidebar-width', initialExpanded ? '16rem' : '4rem');
    }
  }, []);
  
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('sidebar-expanded', String(expanded));
      // Update CSS variable for main content margin
      document.documentElement.style.setProperty('--sidebar-width', expanded ? '16rem' : '4rem');
    }
  }, [expanded]);

  // Listen to auth state changes to update user data
  useEffect(() => {
    const supabase = createClient();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      const u = session?.user;
      if (u) {
        const meta = (u as any).user_metadata || {};
        const rawPicture = meta.picture ?? meta.avatar_url ?? null;
        const picture = typeof rawPicture === 'string' && rawPicture.trim().length > 0 ? rawPicture.trim() : null;
        const name = meta.name || meta.full_name || u.email?.split('@')[0] || null;
        const email = u.email ?? null;

        setUserName(name);
        setUserEmail(email);
        setUserAvatar(picture);

        if (event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN') {
          await refreshUserRole();
        }
      } else if (event === 'SIGNED_OUT') {
        setUserName(null);
        setUserEmail(null);
        setUserAvatar(null);
        setCachedUserRole(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [refreshUserRole]);

  const handleSignOut = async () => {
    try {
      console.log('Signing out...');
      const response = await fetch('/api/auth/signout', {
        method: 'POST',
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Sign out API error:', errorData);
      } else {
        console.log('Sign out successful');
      }
      
      // Force a hard redirect to clear everything
      window.location.replace('/auth/signin');
    } catch (error) {
      console.error('Sign out failed:', error);
      // Still redirect even on error
      window.location.replace('/auth/signin');
    }
  };

  // Helper function to close mobile menu
  const closeMobileMenu = useCallback(() => {
    if (externalMobileOpen !== undefined && onMobileClose) {
      onMobileClose();
    } else {
      setInternalMobileOpen(false);
    }
  }, [externalMobileOpen, onMobileClose]);

  // Close mobile menu when route changes (only if pathname actually changed)
  useEffect(() => {
    if (prevPathnameRef.current !== null && prevPathnameRef.current !== pathname && mobileOpen) {
      closeMobileMenu();
    }
    prevPathnameRef.current = pathname;
  }, [pathname, mobileOpen, closeMobileMenu]);

  return (
    <>
      {/* Mobile overlay - z-40 */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={closeMobileMenu}
          aria-hidden="true"
        />
      )}

      {/* Sidebar - z-50 when mobile open, z-40 on desktop */}
      <aside 
        className={`
          ${expanded || mobileOpen ? 'w-60' : 'w-16'} 
          bg-[#1d1d1f] text-white transition-all duration-200 ease-in-out flex flex-col py-4 fixed left-0 top-0 h-screen z-50 md:z-40
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
        aria-label="App navigation"
      >
        {/* Close button for mobile */}
        <div className="px-2 flex items-center gap-2 mb-4 md:mb-0">
          <button 
            onClick={() => {
              setExpanded((v) => !v);
            }} 
            className="w-9 h-9 rounded-lg hover:bg-white/10 flex items-center justify-center hidden md:flex" 
            title={expanded ? 'Collapse' : 'Expand'}
          >
            <div className="w-5 h-5 rounded-full bg-gradient-to-b from-[#7c3aed] to-[#6d28d9]"></div>
          </button>
          <button
            onClick={closeMobileMenu}
            className="w-9 h-9 rounded-lg hover:bg-white/10 flex items-center justify-center md:hidden"
            aria-label="Close menu"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="w-5 h-5" fill="currentColor">
              <path d="M361.3 320L498.1 183.2C507.8 173.5 507.8 157.7 498.1 148C488.4 138.3 472.6 138.3 462.9 148L326.1 284.8C322.5 288.4 317.5 288.4 313.9 284.8L177.1 148C167.4 138.3 151.6 138.3 141.9 148C132.2 157.7 132.2 173.5 141.9 183.2L278.7 320L141.9 456.8C132.2 466.5 132.2 482.3 141.9 492C151.6 501.7 167.4 501.7 177.1 492L313.9 355.2C317.5 351.6 322.5 351.6 326.1 355.2L462.9 492C472.6 501.7 488.4 501.7 498.1 492C507.8 482.3 507.8 466.5 498.1 456.8L361.3 320z"/>
            </svg>
          </button>
          {(expanded || mobileOpen) && <span className="font-bold tracking-tighter">wallflower.ai</span>}
        </div>

      <nav className="mt-2 flex-1 flex flex-col gap-1 text-sm font-bold">
        <div className="px-2">
          <Link 
            href="/editor" 
            className={`px-3 py-2 flex items-center gap-3 rounded-lg transition-colors ${
              pathname === '/editor' || pathname.startsWith('/editor?')
                ? 'bg-white/5 text-white'
                : 'hover:bg-white/5 text-white/'
            }`}
          >
            <span className="inline-flex w-8 justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="w-5 h-5" fill="currentColor">
                <path d="M535.6 85.7C513.7 63.8 478.3 63.8 456.4 85.7L432 110.1L529.9 208L554.3 183.6C576.2 161.7 576.2 126.3 554.3 104.4L535.6 85.7zM236.4 305.7C230.3 311.8 225.6 319.3 222.9 327.6L193.3 416.4C190.4 425 192.7 434.5 199.1 441C205.5 447.5 215 449.7 223.7 446.8L312.5 417.2C320.7 414.5 328.2 409.8 334.4 403.7L496 241.9L398.1 144L236.4 305.7zM160 128C107 128 64 171 64 224L64 480C64 533 107 576 160 576L416 576C469 576 512 533 512 480L512 384C512 366.3 497.7 352 480 352C462.3 352 448 366.3 448 384L448 480C448 497.7 433.7 512 416 512L160 512C142.3 512 128 497.7 128 480L128 224C128 206.3 142.3 192 160 192L256 192C273.7 192 288 177.7 288 160C288 142.3 273.7 128 256 128L160 128z"/>
              </svg>
            </span>
            {(expanded || mobileOpen) && <span>Create</span>}
          </Link>
        </div>
        <div className="px-2">
          <Link 
            href="/templates" 
            className={`px-3 py-2 flex items-center gap-3 rounded-lg transition-colors ${
              pathname === '/templates' || pathname.startsWith('/templates?')
                ? 'bg-white/5 text-white'
                : 'hover:bg-white/5 text-white'
            }`}
          >
            <span className="inline-flex w-8 justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="w-5 h-5" fill="currentColor">
                <path d="M128 160C128 124.7 156.7 96 192 96L512 96C547.3 96 576 124.7 576 160L576 416C576 451.3 547.3 480 512 480L192 480C156.7 480 128 451.3 128 416L128 160zM56 192C69.3 192 80 202.7 80 216L80 512C80 520.8 87.2 528 96 528L456 528C469.3 528 480 538.7 480 552C480 565.3 469.3 576 456 576L96 576C60.7 576 32 547.3 32 512L32 216C32 202.7 42.7 192 56 192zM224 224C241.7 224 256 209.7 256 192C256 174.3 241.7 160 224 160C206.3 160 192 174.3 192 192C192 209.7 206.3 224 224 224zM420.5 235.5C416.1 228.4 408.4 224 400 224C391.6 224 383.9 228.4 379.5 235.5L323.2 327.6L298.7 297C294.1 291.3 287.3 288 280 288C272.7 288 265.8 291.3 261.3 297L197.3 377C191.5 384.2 190.4 394.1 194.4 402.4C198.4 410.7 206.8 416 216 416L488 416C496.7 416 504.7 411.3 508.9 403.7C513.1 396.1 513 386.9 508.4 379.4L420.4 235.4z"/>
              </svg>
            </span>
            {(expanded || mobileOpen) && <span>Templates</span>}
          </Link>
        </div>
        <div className="px-2">
          <Link 
            href="/designs" 
            className={`px-3 py-2 flex items-center gap-3 rounded-lg transition-colors ${
              pathname === '/designs' || pathname.startsWith('/designs?')
                ? 'bg-white/5 text-white'
                : 'hover:bg-white/5 text-white'
            }`}
          >
            <span className="inline-flex w-8 justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="w-5 h-5" fill="currentColor">
                <path d="M88 289.6L64.4 360.2L64.4 160C64.4 124.7 93.1 96 128.4 96L267.1 96C280.9 96 294.4 100.5 305.5 108.8L343.9 137.6C349.4 141.8 356.2 144 363.1 144L480.4 144C515.7 144 544.4 172.7 544.4 208L544.4 224L179 224C137.7 224 101 250.4 87.9 289.6zM509.8 512L131 512C98.2 512 75.1 479.9 85.5 448.8L133.5 304.8C140 285.2 158.4 272 179 272L557.8 272C590.6 272 613.7 304.1 603.3 335.2L555.3 479.2C548.8 498.8 530.4 512 509.8 512z"/>
              </svg>
            </span>
            {(expanded || mobileOpen) && <span>My Designs</span>}
          </Link>
        </div>
      </nav>

      {/* Bottom account section with drop-up menu */}
      <div className="mt-auto px-2 pt-2 relative">
        <Menu.Root>
          <Menu.Trigger className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-white/5">
            <span className="inline-flex w-8 h-8 rounded-full overflow-hidden items-center justify-center">
              {userAvatar && /^https?:\/\//.test(userAvatar) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img 
                  src={userAvatar} 
                  alt="Avatar" 
                  className="w-full h-full object-cover" 
                  onError={() => setUserAvatar(null)}
                  referrerPolicy="no-referrer"
                  crossOrigin="anonymous"
                />
              ) : (
                <span
                  className="w-full h-full flex items-center justify-center text-white font-semibold"
                  style={{ backgroundColor: getAvatarColor(userName || userEmail) }}
                  aria-hidden="true"
                >
                  {getAvatarLetter(userName, userEmail)}
                </span>
              )}
            </span>
            {(expanded || mobileOpen) && (
              <span className="flex-1 min-w-0 flex flex-col text-left">
                <span className="text-sm font-bold leading-tight truncate">{userName ?? 'Account'}</span>
                <span className="text-[11px] text-white/60 leading-tight truncate">{userEmail ?? ''}</span>
              </span>
            )}
            <span className="ml-auto text-white/60">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="w-3.5 h-3.5" fill="currentColor"><path d="M320 392L192 264h256L320 392z"/></svg>
            </span>
          </Menu.Trigger>
          <Menu.Portal>
            {/* Menu portal renders outside sidebar DOM, so it needs high z-index to appear above everything */}
            <Menu.Positioner side="top" align="start" sideOffset={10} className="z-[9999]">
              <Menu.Popup className="bg-white text-black rounded-lg shadow-xl min-w-[224px] overflow-hidden">
                <Menu.Item className="px-3 py-3 text-xs font-bold hover:bg-[#7c3aed] hover:text-white cursor-pointer border-b border-black/5">
                  <Link href="/account" className="block w-full">Account</Link>
                </Menu.Item>
                {userRole === 'admin' && (
                  <>
                    <Menu.Item className="px-3 py-3 text-xs font-bold hover:bg-[#7c3aed] hover:text-white cursor-pointer border-b border-black/5">
                      <Link href="/admin" className="block w-full">Admin Panel</Link>
                    </Menu.Item>
                  </>
                )}
                <Menu.Item onClick={handleSignOut} className="px-3 py-3 text-xs font-bold hover:bg-[#7c3aed] hover:text-white cursor-pointer">Sign out</Menu.Item>
              </Menu.Popup>
            </Menu.Positioner>
          </Menu.Portal>
        </Menu.Root>
        {(expanded || mobileOpen) && <div className="text-[10px] text-white/40 px-2 py-1">© 2025</div>}
      </div>
    </aside>
    </>
  );
}

