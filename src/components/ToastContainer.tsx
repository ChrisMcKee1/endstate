'use client';

import { memo, useEffect } from 'react';
import { useToast } from '@/hooks/useToast';

const TOAST_COLORS = {
  error: 'border-red-500/50 bg-red-950/80 text-red-200',
  success: 'border-emerald-500/50 bg-emerald-950/80 text-emerald-200',
  info: 'border-accent/50 bg-overlay/80 text-text-secondary',
} as const;

export const ToastContainer = memo(function ToastContainer() {
  const { toasts, subscribe, dismiss } = useToast();

  useEffect(() => subscribe(), [subscribe]);

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm"
      role="region"
      aria-label="Notifications"
    >
      {toasts.map(toast => (
        <div
          key={toast.id}
          role="alert"
          className={`px-4 py-3 rounded-lg border text-xs backdrop-blur-sm ${TOAST_COLORS[toast.type]}`}
        >
          <div className="flex items-center justify-between gap-3">
            <span>{toast.message}</span>
            <button
              onClick={() => dismiss(toast.id)}
              className="text-current opacity-60 hover:opacity-100 shrink-0"
              aria-label="Dismiss notification"
            >
              &times;
            </button>
          </div>
        </div>
      ))}
    </div>
  );
});
