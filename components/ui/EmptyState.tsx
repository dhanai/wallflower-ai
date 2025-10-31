'use client';

import { ReactNode } from 'react';
import clsx from 'clsx';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  contentClassName?: string;
}

export function EmptyState({ icon, title, description, action, className, contentClassName }: EmptyStateProps) {
  return (
    <div
      className={clsx(
        'bg-white/80 backdrop-blur-xl rounded-2xl border border-gray-200 shadow-xl p-12 md:p-16 text-center flex items-center justify-center',
        className,
      )}
    >
      <div className={clsx('max-w-lg mx-auto space-y-6', contentClassName)}>
        {icon && <div className="flex justify-center">{icon}</div>}
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight text-[#1d1d1f]">{title}</h2>
          {description && <p className="text-gray-500">{description}</p>}
        </div>
        {action && <div className="flex justify-center">{action}</div>}
      </div>
    </div>
  );
}


