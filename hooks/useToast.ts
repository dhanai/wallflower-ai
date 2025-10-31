import { toastManager } from '@/components/ToastProvider';
import { Toast } from '@base-ui-components/react/toast';

export function useToast() {
  return {
    toast: (options: {
      title?: string;
      description?: string;
      type?: 'success' | 'error' | 'info' | 'warning';
      timeout?: number;
    }) => {
      const { title, description, type = 'info', timeout } = options;
      
      // Map type to priority
      const priority = type === 'error' ? 'high' : 'low';
      
      return toastManager.add({
        title,
        description,
        type,
        priority,
        timeout: timeout ?? (type === 'error' ? 7000 : 5000),
      });
    },
    success: (message: string, title?: string) => {
      return toastManager.add({
        title: title || 'Success',
        description: message,
        type: 'success',
        priority: 'low',
        timeout: 5000,
      });
    },
    error: (message: string, title?: string) => {
      return toastManager.add({
        title: title || 'Error',
        description: message,
        type: 'error',
        priority: 'high',
        timeout: 7000,
      });
    },
    info: (message: string, title?: string) => {
      return toastManager.add({
        title: title || 'Info',
        description: message,
        type: 'info',
        priority: 'low',
        timeout: 5000,
      });
    },
    warning: (message: string, title?: string) => {
      return toastManager.add({
        title: title || 'Warning',
        description: message,
        type: 'warning',
        priority: 'low',
        timeout: 6000,
      });
    },
  };
}

