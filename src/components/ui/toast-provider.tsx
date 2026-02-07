'use client';

import { Toaster as SonnerToaster } from 'sonner';

export function ToastProvider() {
  return (
    <SonnerToaster
      position="top-right"
      toastOptions={{
        style: {
          background: '#fff',
          border: '1px solid #e5e7eb',
          color: '#111827',
          fontSize: '14px',
        },
      }}
      richColors
      closeButton
    />
  );
}
