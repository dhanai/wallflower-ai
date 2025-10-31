'use client';

import { ChangeEvent } from 'react';
import clsx from 'clsx';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
  onClear?: () => void;
}

export function SearchInput({
  value,
  onChange,
  placeholder = 'Search…',
  className,
  inputClassName,
  onClear,
}: SearchInputProps) {
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange(event.target.value);
  };

  const handleClear = () => {
    onChange('');
    onClear?.();
  };

  return (
    <div className={clsx('relative flex-1', className)}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 512 512"
        className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
        fill="currentColor"
      >
        <path d="M416 208c0 45.9-14.9 88.3-40 122.7L502.6 457.4c12.5 12.5 12.5 32.8 0 45.3s-32.8 12.5-45.3 0L330.7 376c-34.4 25.2-76.8 40-122.7 40C93.1 416 0 322.9 0 208S93.1 0 208 0S416 93.1 416 208zM208 352a144 144 0 1 0 0-288 144 144 0 1 0 0 288z" />
      </svg>

      <input
        type="text"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        className={clsx(
          'w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#7c3aed] focus:border-transparent transition-all text-[#1d1d1f] placeholder-gray-400 placeholder:tracking-tight placeholder:text-sm placeholder:font-medium tracking-tight text-sm font-medium',
          inputClassName
        )}
      />

      {value && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="w-5 h-5" fill="currentColor">
            <path d="M374.6 320L573.3 121.3C581.1 113.5 581.1 101.2 573.3 93.4C565.5 85.6 553.2 85.6 545.4 93.4L346.7 292.6L147.4 93.4C139.6 85.6 127.3 85.6 119.5 93.4C111.7 101.2 111.7 113.5 119.5 121.3L318.2 320L119.5 518.7C111.7 526.5 111.7 538.8 119.5 546.6C123.4 550.5 128.6 552.5 133.8 552.5C139 552.5 144.2 550.5 148.1 546.6L346.7 348L545.4 546.7C549.3 550.6 554.5 552.6 559.7 552.6C564.9 552.6 570.1 550.6 574 546.7C581.8 538.9 581.8 526.6 574 518.8L374.6 320z" />
          </svg>
        </button>
      )}
    </div>
  );
}


