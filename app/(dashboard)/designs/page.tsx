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
      <div className="min-h-screen bg-[#f5f5f7] p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <div className="h-8 w-48 bg-gray-200 rounded-xl animate-pulse mb-4" />
            <div className="h-5 w-64 bg-gray-200 rounded-lg animate-pulse" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="aspect-[4/5] bg-gray-200 animate-pulse rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f5f7] p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-4xl md:text-5xl font-semibold mb-2 tracking-tight text-[#1d1d1f]">
              My Designs
            </h1>
            <p className="text-gray-500 text-base md:text-lg">
              {designs.length === 0 
                ? 'Start creating AI-powered designs' 
                : `${designs.length} ${designs.length === 1 ? 'design' : 'designs'}`}
            </p>
          </div>
          <Link
            href="/editor"
            className="px-6 py-3 bg-[#7c3aed] text-white rounded-xl hover:bg-[#6d28d9] font-medium tracking-tight transition-all shadow-lg shadow-[#7c3aed]/20 hover:shadow-[#7c3aed]/30 w-fit"
          >
            Create New Design
          </Link>
        </div>

        {designs.length === 0 ? (
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-gray-200 p-12 md:p-16 text-center">
            <div className="max-w-md mx-auto">
              <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-gradient-to-b from-[#7c3aed] to-[#6d28d9] shadow-2xl shadow-[#7c3aed]/40 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="w-12 h-12 text-white" fill="currentColor">
                  <path d="M96 128h448v384H96z"/>
                </svg>
              </div>
              <h2 className="text-2xl font-semibold mb-2 tracking-tight text-[#1d1d1f]">
                No designs yet
              </h2>
              <p className="text-gray-500 mb-8">
                Create your first AI-powered design and bring your ideas to life.
              </p>
              <Link
                href="/editor"
                className="inline-block px-8 py-3 bg-[#7c3aed] text-white rounded-xl hover:bg-[#6d28d9] font-medium tracking-tight transition-all shadow-lg shadow-[#7c3aed]/20 hover:shadow-[#7c3aed]/30"
              >
                Create Your First Design
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {designs.map((design) => (
              <Link
                key={design.id}
                href={`/editor?design=${design.id}`}
                className="group relative aspect-[4/5] rounded-2xl overflow-hidden bg-white/80 backdrop-blur-xl border border-gray-200 hover:shadow-2xl hover:shadow-[#7c3aed]/10 transition-all duration-300 hover:-translate-y-1"
              >
                <div className="absolute inset-0">
                  <Image
                    src={design.image_url}
                    alt={design.title || 'Design'}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="absolute bottom-0 left-0 right-0 p-5 text-white">
                    <h3 className="font-semibold text-lg mb-1 truncate">
                      {design.title || 'Untitled Design'}
                    </h3>
                    <p className="text-sm text-white/80 font-light">
                      {new Date(design.created_at).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric', 
                        year: 'numeric' 
                      })}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
