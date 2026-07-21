import { cn } from '@brooks/ui';
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

/**
 * Horizontal scroller with chevron affordances that fade in only when there's
 * more to scroll in that direction, and fade out smoothly at the ends. Used for
 * the Popular row and the category rail.
 */
export function HScroll({
  children,
  className,
  wrapperClassName,
}: {
  children: ReactNode;
  className?: string;
  wrapperClassName?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(true);

  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= 2);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 2);
  }, []);

  useEffect(() => {
    update();
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener('resize', update);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', update);
    };
  }, [update]);

  const scroll = (dir: 1 | -1) => ref.current?.scrollBy({ left: dir * ref.current.clientWidth * 0.8, behavior: 'smooth' });

  const btn = 'absolute top-1/2 z-10 grid size-9 -translate-y-1/2 cursor-pointer place-items-center rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--card))] text-[hsl(var(--foreground))] shadow-md transition-opacity duration-300 hover:bg-[hsl(var(--muted))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]';

  return (
    <div className={cn('relative', wrapperClassName)}>
      <div ref={ref} onScroll={update} className={cn('no-scrollbar overflow-x-auto', className)}>
        {children}
      </div>
      <button
        type="button"
        aria-label="Scroll left"
        onClick={() => scroll(-1)}
        className={cn(btn, 'left-1', atStart && 'pointer-events-none opacity-0')}
      >
        <ChevronLeft className="size-5" aria-hidden />
      </button>
      <button
        type="button"
        aria-label="Scroll right"
        onClick={() => scroll(1)}
        className={cn(btn, 'right-1', atEnd && 'pointer-events-none opacity-0')}
      >
        <ChevronRight className="size-5" aria-hidden />
      </button>
    </div>
  );
}

/**
 * Floating "more below" pill that appears when the page can still scroll down
 * and fades out smoothly as you reach the bottom.
 */
export function ScrollDownHint() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const update = () => {
      const doc = document.documentElement;
      const remaining = doc.scrollHeight - (window.scrollY + window.innerHeight);
      setShow(doc.scrollHeight - window.innerHeight > 240 && remaining > 160);
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    const t = window.setInterval(update, 800); // catches async content growth (menu loads)
    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
      window.clearInterval(t);
    };
  }, []);

  return (
    <button
      type="button"
      aria-label="Scroll down for more"
      aria-hidden={!show}
      tabIndex={show ? 0 : -1}
      onClick={() => window.scrollBy({ top: window.innerHeight * 0.8, behavior: 'smooth' })}
      className={cn(
        'fixed bottom-24 left-1/2 z-30 flex -translate-x-1/2 cursor-pointer items-center gap-1.5 rounded-full border-2 border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-2 text-sm font-bold text-[hsl(var(--foreground))] shadow-lg transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--ring))]',
        show ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-3 opacity-0',
      )}
    >
      More <ChevronDown className="size-4" aria-hidden />
    </button>
  );
}
