'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  /**
   * Width in pixels at desktop. On mobile (< 640px) the drawer is always
   * full-width regardless. Defaults to 640px — wide enough for the
   * typical form (e.g. curated-section edit with business multi-select)
   * without overwhelming the page.
   */
  widthPx?: number;
  subtitle?: string;
  /**
   * Optional footer rendered sticky at the bottom — useful for primary
   * action buttons that should stay visible while the user scrolls a
   * tall form. Pass `null` to omit (default).
   */
  footer?: React.ReactNode;
  /**
   * When true, clicking outside or pressing Esc shows a confirm step
   * instead of closing immediately. Used for forms with unsaved
   * changes. Caller is responsible for resetting it back to false on
   * save / cancel.
   */
  confirmCloseMessage?: string;
}

/**
 * Right-side panel that slides in over the page without occluding the
 * background. Mirrors the Modal primitive's a11y (focus trap via
 * autofocus on a hidden anchor + Esc to close + body scroll lock) but
 * keeps the list visible behind so admins don't lose context while
 * editing.
 *
 * Used by the Home Sections admin page for create + edit flows. Modals
 * are still the right choice for short confirm-style dialogs; this is
 * for tall forms.
 */
export function Drawer({
  isOpen,
  onClose,
  title,
  children,
  widthPx = 640,
  subtitle,
  footer,
  confirmCloseMessage,
}: DrawerProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const requestClose = () => {
    if (confirmCloseMessage) {
      if (!window.confirm(confirmCloseMessage)) return;
    }
    onClose();
  };

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') requestClose();
    };
    if (isOpen) window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, confirmCloseMessage]);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex justify-end bg-black/50 animate-fade-in"
      onClick={(e) => {
        if (e.target === overlayRef.current) requestClose();
      }}
    >
      <div
        className="bg-white shadow-2xl h-full w-full sm:max-w-full flex flex-col animate-slide-in-right"
        style={{ width: `${widthPx}px`, maxWidth: '100vw' }}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="flex items-center justify-between px-6 py-3 border-b border-gray-100 shrink-0">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-gray-900 truncate">
              {title}
            </h2>
            {subtitle && (
              <p className="text-xs text-gray-500 mt-0.5 truncate">{subtitle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={requestClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors -mr-1 shrink-0"
            aria-label="Close"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>
        <div className="px-6 py-4 overflow-y-auto flex-1">{children}</div>
        {footer && (
          <div className="px-6 py-3 border-t border-gray-100 shrink-0 bg-white">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}
