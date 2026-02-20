import { useState, useRef, useEffect } from 'react';

/**
 * An inline link to another module's concept. Shows a hover tooltip
 * with the concept description after a 400ms delay. Clicking navigates
 * via window.location.hash (handled by App.jsx hashchange listener).
 */
export default function ConceptLink({ moduleId, display, desc, children }) {
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState('below');
  const timerRef = useRef(null);
  const linkRef = useRef(null);

  const enter = () => {
    timerRef.current = setTimeout(() => {
      // Position tooltip above if near bottom of viewport
      if (linkRef.current) {
        const rect = linkRef.current.getBoundingClientRect();
        setPos(rect.bottom > window.innerHeight - 120 ? 'above' : 'below');
      }
      setShow(true);
    }, 400);
  };
  const leave = () => {
    clearTimeout(timerRef.current);
    setShow(false);
  };

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const navigate = (e) => {
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
          <span className="block font-medium text-[var(--color-text-primary)] mb-0.5">{display}</span>
          <span className="block text-[var(--svg-text-faint)]">{desc}</span>
        </span>
      )}
    </span>
  );
}
