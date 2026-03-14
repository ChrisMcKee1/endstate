import { useState, useCallback } from 'react';

interface Toast {
  id: string;
  message: string;
  type: 'error' | 'success' | 'info';
}

// Module-level subscribers for cross-component toast triggering
const listeners = new Set<(toast: Toast) => void>();

export function showToast(message: string, type: Toast['type'] = 'error') {
  const toast: Toast = { id: crypto.randomUUID(), message, type };
  listeners.forEach(fn => fn(toast));
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Toast) => {
    setToasts(prev => [...prev, toast]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== toast.id));
    }, 5000);
  }, []);

  const subscribe = useCallback(() => {
    listeners.add(addToast);
    return () => { listeners.delete(addToast); };
  }, [addToast]);

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return { toasts, subscribe, dismiss };
}
