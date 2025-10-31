'use client';

import * as React from 'react';
import { Toast } from '@base-ui-components/react/toast';
import ToastRenderer from './ToastRenderer';

export const toastManager = Toast.createToastManager();

export default function ToastProvider({ children }: { children: React.ReactNode }) {
  return (
    <Toast.Provider toastManager={toastManager} timeout={5000} limit={3}>
      {children}
      <Toast.Portal>
        <Toast.Viewport className="fixed bottom-0 right-0 z-50 flex max-h-screen w-full flex-col gap-2 p-4 sm:max-w-md">
          <ToastRenderer />
        </Toast.Viewport>
      </Toast.Portal>
    </Toast.Provider>
  );
}

