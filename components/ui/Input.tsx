'use client';

import clsx from 'clsx';
import { forwardRef, InputHTMLAttributes } from 'react';

type InputVariant = 'default' | 'filled';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  variant?: InputVariant;
  error?: string;
}

const baseStyles = 'block w-full rounded-xl border transition-all focus:outline-none focus:ring-2 focus:ring-[#7c3aed]/20 focus:border-[#7c3aed]/30 placeholder:text-gray-400';

const variantStyles: Record<InputVariant, string> = {
  default: 'bg-white text-[#1d1d1f] border-gray-200 focus:bg-white',
  filled: 'bg-gray-50 text-[#1d1d1f] border-transparent focus:bg-white',
};

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, variant = 'default', error, ...props },
  ref
) {
  return (
    <div className="space-y-1">
      <input
        ref={ref}
        className={clsx(baseStyles, variantStyles[variant], error && 'border-red-300 focus:border-red-400 focus:ring-red-200', className)}
        {...props}
      />
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
});


