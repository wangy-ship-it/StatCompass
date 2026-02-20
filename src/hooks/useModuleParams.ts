import { useState, useCallback } from 'react';

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

  const set = useCallback(
    (key: keyof T & string, value: T[keyof T & string]) => {
      setParams((prev) => {
        const next = { ...prev, [key]: value };
        const hash = window.location.hash;
        const moduleId = hash.replace('#', '').split('?')[0];
        const searchParams = new URLSearchParams();
        for (const [k, v] of Object.entries(next)) {
          if (v !== defaults[k]) {
            searchParams.set(k, typeof v === 'boolean' ? (v ? '1' : '0') : String(v));
          }
        }
        const qs = searchParams.toString();
        const newHash = qs ? moduleId + '?' + qs : moduleId;
        window.history.replaceState(null, '', '#' + newHash);
        return next;
      });
    },
    [defaults],
  );

  return [params, set];
}
