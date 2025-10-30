'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import Image from 'next/image';
import Link from 'next/link';

interface DesignTemplate {
  id: string;
  title: string;
  description: string;
  image_url: string;
  category: string;
}

export default function DesignSelector() {
  const [templates, setTemplates] = useState<DesignTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function loadTemplates() {
      try {
        const { data, error } = await supabase
          .from('design_templates')
          .select('*')
          .eq('featured', true)
          .limit(12);

        if (error) throw error;
        setTemplates(data || []);
      } catch (error) {
        console.error('Error loading templates:', error);
      } finally {
        setLoading(false);
      }
    }

    loadTemplates();
  }, [supabase]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="aspect-square bg-gray-100 animate-pulse rounded-2xl border border-gray-200" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {templates.map((template) => (
        <Link
          key={template.id}
          href={`/editor?template=${template.id}`}
          className="group relative aspect-square rounded-2xl overflow-hidden border border-gray-200 hover:shadow-xl hover:scale-[1.02] transition-all duration-300"
        >
          <Image
            src={template.image_url}
            alt={template.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
              <h3 className="font-semibold text-lg mb-1">{template.title}</h3>
              {template.description && (
                <p className="text-sm text-white/90 font-light">{template.description}</p>
              )}
            </div>
          </div>
        </Link>
      ))}
      {templates.length === 0 && (
        <div className="col-span-full text-center py-12 text-gray-500">
          No templates available. Check back soon!
        </div>
      )}
    </div>
  );
}
