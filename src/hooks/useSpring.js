import { useState, useRef, useCallback, useEffect } from 'react';

const EPSILON = 0.001;
const STIFFNESS = 0.08; // exponential damping factor (~80-120ms settle)

/**
 * Exponential-damped spring that smoothly interpolates a numeric value toward a target.
 * Returns the animated value. Auto-stops when within epsilon of target.
 * Respects prefers-reduced-motion.
 */
export default function useSpring(target) {
  const prefersReduced = useRef(
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
  const [value, setValue] = useState(target);
  const currentRef = useRef(target);
  const targetRef = useRef(target);
  const rafRef = useRef(null);

  const tick = useCallback(() => {
    const cur = currentRef.current;
    const tgt = targetRef.current;
    const diff = tgt - cur;
    if (Math.abs(diff) < EPSILON) {
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
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return prefersReduced.current ? target : value;
}
