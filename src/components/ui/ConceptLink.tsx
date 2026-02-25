import { useState, useRef, useEffect, type ReactNode, type MouseEvent } from 'react';

interface ConceptLinkProps {
  moduleId: string;
  display: string;
  desc: string;
  children: ReactNode;
}

export default function ConceptLink({ moduleId, display, desc, children }: ConceptLinkProps) {
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState<'above' | 'below'>('below');
  const [hOffset, setHOffset] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const linkRef = useRef<HTMLAnchorElement>(null);

  const enter = () => {
    timerRef.current = setTimeout(() => {
      if (linkRef.current) {
        const rect = linkRef.current.getBoundingClientRect();
        setPos(rect.bottom > window.innerHeight - 120 ? 'above' : 'below');
        // Issue 10: viewport clamping for tooltip
        const center = rect.left + rect.width / 2;
        const tooltipW = 220;
        const half = tooltipW / 2;
        let offset = 0;
        if (center - half < 8) offset = 8 - (center - half);
        else if (center + half > window.innerWidth - 8)
          offset = window.innerWidth - 8 - (center + half);
        setHOffset(offset);
      }
      setShow(true);
    }, 400);
  };
  const leave = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setShow(false);
  };

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    [],
  );

  const navigate = (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    window.location.hash = moduleId;
    window.scrollTo(0, 0);
  };

  return (
    <span className="relative inline" onMouseEnter={enter} onMouseLeave={leave}>
      <a
        ref={linkRef}
        href={'#' + moduleId}
        onClick={navigate}
        className="text-[var(--color-accent)] underline decoration-[var(--color-accent-ring)] decoration-1 underline-offset-2 hover:decoration-[var(--color-accent)] transition-colors cursor-pointer"
      >
        {children}
      </a>
      {show && (
        <span
          className={
            'absolute z-50 left-1/2 w-[220px] px-3 py-2 rounded-lg text-[12px] leading-[1.5] bg-[var(--color-app-surface)] ring-1 ring-[var(--color-border)] shadow-lg pointer-events-none ' +
            (pos === 'above' ? 'bottom-full mb-2' : 'top-full mt-2')
          }
          style={{ transform: `translateX(calc(-50% + ${hOffset}px))` }}
        >
          <span className="block font-medium text-[var(--color-text-primary)] mb-0.5">
            {display}
          </span>
          <span className="block text-[var(--svg-text-faint)]">{desc}</span>
        </span>
      )}
    </span>
  );
}
