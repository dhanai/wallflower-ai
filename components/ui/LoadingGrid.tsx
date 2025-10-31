'use client';

import clsx from 'clsx';

interface LoadingGridProps {
  count?: number;
  className?: string;
  itemClassName?: string;
  columnsClassName?: string;
}

export function LoadingGrid({
  count = 8,
  className,
  itemClassName,
  columnsClassName = 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6',
}: LoadingGridProps) {
  return (
    <div className={clsx(columnsClassName, className)}>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className={clsx('aspect-[4/5] bg-gray-200/70 animate-pulse rounded-2xl', itemClassName)}
        />
      ))}
    </div>
  );
}


