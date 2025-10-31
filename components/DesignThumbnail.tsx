'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ReactNode } from 'react';
import clsx from 'clsx';

interface DesignThumbnailProps {
  href: string;
  imageUrl: string;
  title: string;
  subtitle?: string;
  overlayContent?: ReactNode;
  className?: string;
}

export function DesignThumbnail({ href, imageUrl, title, subtitle, overlayContent, className }: DesignThumbnailProps) {
  return (
    <Link
      href={href}
      className={clsx(
        'group relative block w-full aspect-[4/5] rounded-xl overflow-hidden bg-white/80 backdrop-blur-xl border border-gray-200 hover:shadow-2xl hover:shadow-[#7c3aed]/10 transition-all duration-300 hover:-translate-y-1',
        className,
      )}
    >
      <div className="absolute inset-0 w-full h-full">
        <Image
          src={imageUrl}
          alt={title || 'Design'}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          className="object-cover group-hover:scale-105 transition-transform duration-500"
        />
      </div>

      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <div className="absolute bottom-0 left-0 right-0 p-4 text-white space-y-1">
          <h3 className="font-semibold text-base truncate">{title || 'Untitled'}</h3>
          {subtitle && <p className="text-xs text-white/80 font-light truncate">{subtitle}</p>}
          {overlayContent}
        </div>
      </div>
    </Link>
  );
}


