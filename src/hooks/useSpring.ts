import { useState, useRef, useCallback, useEffect } from 'react';

const EPSILON = 0.001;
const STIFFNESS = 0.08;

export default function useSpring(target: number): number {
  const prefersReduced = useRef(
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  const [value, setValue] = useState(target);
  const currentRef = useRef(target);
  const targetRef = useRef(target);
  const rafRef = useRef<number | null>(null);

  const tick = useCallback(() => {
    const cur = currentRef.current;
    const tgt = targetRef.current;
    const diff = tgt - cur;
    if (Math.abs(diff) < EPSILON * Math.max(1, Math.abs(tgt))) {
      currentRef.current = tgt;
      setValue(tgt);
      rafRef.current = null;
      return;
    }
    const next = cur + diff * STIFFNESS;
    currentRef.current = next;
    setValue(next);
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  useEffect(() => {
    targetRef.current = target;
    if (prefersReduced.current) {
      currentRef.current = target;
      setValue(target);
      return;
    }
    if (!rafRef.current) {
      rafRef.current = requestAnimationFrame(tick);
    }
  }, [target, tick]);

  useEffect(() => {
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, []);

  return prefersReduced.current ? target : value;
}
