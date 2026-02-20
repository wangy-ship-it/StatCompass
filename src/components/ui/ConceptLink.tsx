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
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const linkRef = useRef<HTMLAnchorElement>(null);

  const enter = () => {
    timerRef.current = setTimeout(() => {
      if (linkRef.current) {
        const rect = linkRef.current.getBoundingClientRect();
        setPos(rect.bottom > window.innerHeight - 120 ? 'above' : 'below');
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
            'absolute z-50 left-1/2 -translate-x-1/2 w-[220px] px-3 py-2 rounded-lg text-[12px] leading-[1.5] bg-[var(--color-app-surface)] ring-1 ring-[var(--color-border)] shadow-lg pointer-events-none ' +
            (pos === 'above' ? 'bottom-full mb-2' : 'top-full mt-2')
          }
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
