import { useState, useEffect, useCallback } from 'react';

/**
 * Syncs named slider parameters with URL hash query string.
 * Usage:
 *   const [params, set] = useModuleParams({ alpha: 0.05, effect: 2.0 });
 *   set('alpha', 0.1);
 *
 * URL format: #m1?alpha=0.1&effect=2.0
 */
export default function useModuleParams(defaults) {
  // Parse initial values from hash
  const parseHash = useCallback(() => {
    const hash = window.location.hash;
    const qIdx = hash.indexOf('?');
    if (qIdx === -1) return { ...defaults };
    const params = new URLSearchParams(hash.slice(qIdx + 1));
    const result = { ...defaults };
    for (const key of Object.keys(defaults)) {
      const v = params.get(key);
      if (v === null) continue;
      const t = typeof defaults[key];
      if (t === 'boolean') result[key] = v === '1' || v === 'true';
      else if (t === 'string') result[key] = v;
      else if (!isNaN(+v)) result[key] = +v;
    }
    return result;
  }, []); // defaults is stable per module mount

  const [params, setParams] = useState(parseHash);

  // Update a single param
  const set = useCallback((key, value) => {
    setParams((prev) => {
      const next = { ...prev, [key]: value };
      // Update URL without triggering hashchange navigation
      const hash = window.location.hash;
      const moduleId = hash.replace('#', '').split('?')[0];
      const searchParams = new URLSearchParams();
      for (const [k, v] of Object.entries(next)) {
        // Only include non-default values to keep URLs clean
        if (v !== defaults[k]) {
          searchParams.set(k, typeof v === 'boolean' ? (v ? '1' : '0') : v);
        }
      }
      const qs = searchParams.toString();
      const newHash = qs ? moduleId + '?' + qs : moduleId;
      window.history.replaceState(null, '', '#' + newHash);
      return next;
    });
  }, [defaults]);

  return [params, set];
}
