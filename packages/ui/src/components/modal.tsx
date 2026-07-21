import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../cn';

/**
 * Overlay for dialogs. Renders through a portal on <body> so the fixed backdrop
 * always covers the true viewport (never clipped by a transformed/contained
 * ancestor), and locks body scroll while open — compensating for the scrollbar
 * width so the page doesn't shift. Backdrop click and Esc call onClose.
 *
 * Put your own card element as the child; this only provides the backdrop + scroll.
 */
export function Modal({
  onClose,
  children,
  className,
}: {
  onClose?: () => void;
  children: ReactNode;
  className?: string;
}) {
  useEffect(() => {
    const { body } = document;
    const prevOverflow = body.style.overflow;
    const prevPadding = body.style.paddingRight;
    const scrollbar = window.innerWidth - document.documentElement.clientWidth;
    body.style.overflow = 'hidden';
    if (scrollbar > 0) body.style.paddingRight = `${scrollbar}px`;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', onKey);

    return () => {
      body.style.overflow = prevOverflow;
      body.style.paddingRight = prevPadding;
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return createPortal(
    <div
      className={cn(
        'fixed inset-0 z-50 flex items-start justify-center overflow-y-auto overscroll-contain bg-black/50 p-4 sm:items-center',
        className,
      )}
      // mousedown (not click) so a drag that ends on the backdrop doesn't close it
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      {children}
    </div>,
    document.body,
  );
}
