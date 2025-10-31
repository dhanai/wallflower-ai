'use client';

import * as React from 'react';
import { Toast } from '@base-ui-components/react/toast';

export default function ToastRenderer() {
  const { toasts } = Toast.useToastManager();

  const getTypeStyles = (type?: string) => {
    switch (type) {
      case 'success':
        return 'border-green-200 bg-green-50';
      case 'error':
        return 'border-red-200 bg-red-50';
      case 'warning':
        return 'border-yellow-200 bg-yellow-50';
      case 'info':
        return 'border-blue-200 bg-blue-50';
      default:
        return 'border-gray-200 bg-white';
    }
  };

  const getTypeTextStyles = (type?: string) => {
    switch (type) {
      case 'success':
        return 'text-green-800';
      case 'error':
        return 'text-red-800';
      case 'warning':
        return 'text-yellow-800';
      case 'info':
        return 'text-blue-800';
      default:
        return 'text-[#1d1d1f]';
    }
  };

  return (
    <>
      {toasts.map((toast) => (
        <Toast.Root
          key={toast.id}
          toast={toast}
          className={`group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-xl border p-4 pr-8 shadow-lg transition-all ${getTypeStyles(toast.type)} data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-full data-[state=open]:sm:slide-in-from-bottom-full`}
        >
          <Toast.Content className="flex-1 space-y-1">
            {toast.title && (
              <Toast.Title className={`text-sm font-semibold ${getTypeTextStyles(toast.type)}`}>
                {toast.title}
              </Toast.Title>
            )}
            {toast.description && (
              <Toast.Description className={`text-sm ${getTypeTextStyles(toast.type)} opacity-90`}>
                {toast.description}
              </Toast.Description>
            )}
            {toast.actionProps && (
              <Toast.Action
                {...toast.actionProps}
                className="inline-flex h-8 shrink-0 items-center justify-center rounded-md border border-gray-200 bg-transparent px-3 text-sm font-medium transition-colors hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-[#7c3aed] focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
              />
            )}
          </Toast.Content>
          <Toast.Close className="absolute right-2 top-2 rounded-md p-1 text-gray-400 opacity-0 transition-opacity hover:text-gray-600 focus:opacity-100 focus:outline-none focus:ring-2 group-hover:opacity-100">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 6 6 18" />
              <path d="m6 6 12 12" />
            </svg>
          </Toast.Close>
        </Toast.Root>
      ))}
    </>
  );
}
