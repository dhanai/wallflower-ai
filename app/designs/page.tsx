'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Image from 'next/image';
import Link from 'next/link';

interface Design {
  id: string;
  title: string;
  image_url: string;
  created_at: string;
}

export default function DesignsPage() {
  const [designs, setDesigns] = useState<Design[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function loadDesigns() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          window.location.href = '/auth/signin';
          return;
        }

        const { data, error } = await supabase
          .from('designs')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setDesigns(data || []);
      } catch (error) {
        console.error('Error loading designs:', error);
      } finally {
        setLoading(false);
      }
    }

    loadDesigns();
  }, [supabase]);

  if (loading) {
    return (
      <div className="min-h-screen">
        <header className="border-b">
          <div className="container mx-auto px-4 py-4">
            <Link href="/" className="text-2xl font-bold">
              Wallflower AI
            </Link>
          </div>
        </header>
        <main className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="aspect-square bg-gray-100 animate-pulse rounded-2xl border border-gray-200" />
            ))}
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-gray-200 bg-white/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/" className="text-2xl font-semibold tracking-tight">
            Wallflower AI
          </Link>
          <Link href="/editor" className="px-6 py-2.5 bg-[#1d1d1f] text-white rounded-full hover:bg-[#2d2d2f] font-medium tracking-tight transition-all">
            Create New Design
          </Link>
        </div>
      </header>
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-semibold mb-12 tracking-tight">My Designs</h1>
        
        {designs.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 mb-4">You haven&apos;t created any designs yet.</p>
            <Link
              href="/editor"
              className="inline-block bg-[#1d1d1f] text-white px-8 py-3 rounded-full hover:bg-[#2d2d2f] font-medium tracking-tight transition-all"
            >
              Create Your First Design
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {designs.map((design) => (
              <Link
                key={design.id}
                href={`/editor?design=${design.id}`}
                className="group relative aspect-square rounded-2xl overflow-hidden border border-gray-200 hover:shadow-xl hover:scale-[1.02] transition-all duration-300"
              >
                <Image
                  src={design.image_url}
                  alt={design.title || 'Design'}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform"
                />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                      <h3 className="font-semibold text-lg mb-1">{design.title || 'Untitled Design'}</h3>
                      <p className="text-sm text-white/90 font-light">
                        {new Date(design.created_at).toLocaleDateString()}
                      </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
