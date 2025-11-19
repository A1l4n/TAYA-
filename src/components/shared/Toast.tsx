'use client';

import { useEffect, useState } from 'react';
import { X, CheckCircle2, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { Button } from './Button';
import React from 'react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastProps {
  toast: Toast;
  onRemove: (id: string) => void;
}

const icons = {
  success: CheckCircle2,
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

const colors = {
  success: 'bg-green-500 dark:bg-green-600',
  error: 'bg-red-500 dark:bg-red-600',
  warning: 'bg-yellow-500 dark:bg-yellow-600',
  info: 'bg-blue-500 dark:bg-blue-600',
};

export function ToastComponent({ toast, onRemove }: ToastProps) {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (toast.duration && toast.duration > 0) {
      const timer = setTimeout(() => {
        handleClose();
      }, toast.duration);

      return () => clearTimeout(timer);
    }
  }, [toast.duration]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => onRemove(toast.id), 300);
  };

  const Icon = icons[toast.type];

  return (
    <div
      className={`glass-effect min-w-[300px] max-w-md rounded-xl shadow-2xl overflow-hidden transform transition-all duration-300 ${
        isExiting ? 'opacity-0 translate-x-full' : 'opacity-100 translate-x-0'
      } animate-slide-in`}
    >
      <div className="flex items-start gap-3 p-4">
        <div
          className={`flex-shrink-0 p-2 rounded-lg ${colors[toast.type]} text-white`}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 dark:text-gray-100">
            {toast.title}
          </p>
          {toast.message && (
            <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
              {toast.message}
            </p>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClose}
          className="flex-shrink-0"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function ToastContainer({ toasts, onRemove }: { toasts: Toast[]; onRemove: (id: string) => void }) {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-3 flex flex-col items-end">
      {toasts.map((toast) => (
        <ToastComponent key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  );
}

// Toast hook
let toastIdCounter = 0;
const toastListeners: Array<(toasts: Toast[]) => void> = [];
let toasts: Toast[] = [];

function notifyListeners() {
  toastListeners.forEach((listener) => listener([...toasts]));
}

export function useToast() {
  const [currentToasts, setCurrentToasts] = React.useState<Toast[]>([]);

  React.useEffect(() => {
    toastListeners.push(setCurrentToasts);
    setCurrentToasts([...toasts]);

    return () => {
      const index = toastListeners.indexOf(setCurrentToasts);
      if (index > -1) {
        toastListeners.splice(index, 1);
      }
    };
  }, []);

  const showToast = (toast: Omit<Toast, 'id'>) => {
    // Prevent duplicate toasts within 2 seconds
    const now = Date.now();
    const duplicateWindow = 2000; // 2 seconds
    
    const isDuplicate = toasts.some((existingToast) => {
      const timeDiff = now - parseInt(existingToast.id.split('-')[1] || '0', 10);
      return (
        existingToast.title === toast.title &&
        existingToast.message === toast.message &&
        existingToast.type === toast.type &&
        timeDiff < duplicateWindow
      );
    });

    if (isDuplicate) {
      // Return existing toast ID instead of creating a new one
      const existingToast = toasts.find(
        (t) =>
          t.title === toast.title &&
          t.message === toast.message &&
          t.type === toast.type
      );
      return existingToast?.id || `toast-${++toastIdCounter}`;
    }

    const id = `toast-${++toastIdCounter}-${now}`;
    const newToast: Toast = { ...toast, id };
    toasts.push(newToast);
    notifyListeners();
    return id;
  };

  const removeToast = (id: string) => {
    toasts = toasts.filter((t) => t.id !== id);
    notifyListeners();
  };

  return {
    toasts: currentToasts,
    showToast,
    removeToast,
    success: (title: string, message?: string, duration?: number) =>
      showToast({ type: 'success', title, message, duration }),
    error: (title: string, message?: string, duration?: number) =>
      showToast({ type: 'error', title, message, duration }),
    warning: (title: string, message?: string, duration?: number) =>
      showToast({ type: 'warning', title, message, duration }),
    info: (title: string, message?: string, duration?: number) =>
      showToast({ type: 'info', title, message, duration }),
  };
}

