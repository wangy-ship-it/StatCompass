import { useState, useCallback, useEffect } from 'react';

type ParamValue = number | string | boolean;

export default function useModuleParams<T extends Record<string, ParamValue>>(
  defaults: T,
): [T, (key: keyof T & string, value: T[keyof T & string]) => void] {
  const parseHash = useCallback((): T => {
    const hash = window.location.hash;
    const qIdx = hash.indexOf('?');
    if (qIdx === -1) return { ...defaults };
    const params = new URLSearchParams(hash.slice(qIdx + 1));
    const result = { ...defaults };
    for (const key of Object.keys(defaults) as (keyof T & string)[]) {
      const v = params.get(key);
      if (v === null) continue;
      const t = typeof defaults[key];
      if (t === 'boolean') (result as Record<string, ParamValue>)[key] = v === '1' || v === 'true';
      else if (t === 'string') (result as Record<string, ParamValue>)[key] = v;
      else if (!isNaN(+v)) (result as Record<string, ParamValue>)[key] = +v;
    }
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [params, setParams] = useState<T>(parseHash);

  // Issue 9: sync slider params on browser back/forward
  useEffect(() => {
    const onHash = () => setParams(parseHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, [parseHash]);

  const set = useCallback(
    (key: keyof T & string, value: T[keyof T & string]) => {
      setParams((prev) => ({ ...prev, [key]: value }));
      // Sync URL synchronously but outside the setState updater to keep it pure.
      const hash = window.location.hash;
      const moduleId = hash.replace('#', '').split('?')[0];
      const searchParams = new URLSearchParams();
      const current = parseHash();
      const merged = { ...current, [key]: value };
      for (const [k, v] of Object.entries(merged)) {
        if (v !== defaults[k]) {
          searchParams.set(k, typeof v === 'boolean' ? (v ? '1' : '0') : String(v));
        }
      }
      const qs = searchParams.toString();
      const newHash = qs ? moduleId + '?' + qs : moduleId;
      window.history.replaceState(null, '', '#' + newHash);
    },
    [defaults, parseHash],
  );

  return [params, set];
}
