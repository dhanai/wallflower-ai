'use client';

import clsx from 'clsx';
import { ButtonHTMLAttributes, forwardRef } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';
type ButtonSize = 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
}

const baseStyles = 'inline-flex items-center justify-center font-medium tracking-tight transition-all rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#7c3aed] disabled:opacity-40 disabled:cursor-not-allowed';

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'bg-[#7c3aed] text-white hover:bg-[#6d28d9] shadow-lg shadow-[#7c3aed]/20 hover:shadow-[#7c3aed]/30',
  secondary: 'bg-white text-[#1d1d1f] border border-gray-200 hover:bg-gray-100',
  ghost: 'bg-transparent text-[#1d1d1f] hover:bg-black/5',
};

const sizeStyles: Record<ButtonSize, string> = {
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'primary', size = 'md', block = false, type = 'button', ...props },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      className={clsx(baseStyles, variantStyles[variant], sizeStyles[size], block && 'w-full', className)}
      {...props}
    />
  );
});


