import { useCallback, useEffect, useRef, useState } from 'react';

/** The most useful message out of an API error, or `fallback`. */
export const apiErrorMessage = (err: unknown, fallback: string): string => {
  const data = (err as { response?: { data?: { error?: { message?: string }; detail?: string } } })?.response?.data;
  return data?.error?.message || data?.detail || fallback;
};

/* ------------------------------------------------------------------ */
/* Data loading                                                        */
/* ------------------------------------------------------------------ */

/** Load once (and on deps change); keeps stale data on screen while reloading. */
export function useLoad<T>(fetcher: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const request = useRef(0);

  const load = useCallback(async () => {
    const id = ++request.current;
    setLoading(true);
    setError(null);
    try {
      const result = await fetcher();
      if (id === request.current) setData(result);
    } catch (err) {
      if (id === request.current) setError(apiErrorMessage(err, 'Could not load this right now.'));
    } finally {
      if (id === request.current) setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    void load();
  }, [load]);

  return { data, setData, loading, error, reload: load };
}

/* ------------------------------------------------------------------ */
/* Formatting                                                          */
/* ------------------------------------------------------------------ */

export const relativeTime = (iso?: string | null): string => {
  if (!iso) return 'never';
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 36) return `${hours} h ago`;
  return `${Math.round(hours / 24)} days ago`;
};

export const pct = (value: number | null | undefined, digits = 0): string =>
  value === null || value === undefined ? '—' : `${(value * 100).toFixed(digits)}%`;

/** Plain-language reading of a ROC-AUC. */
export const aucQuality = (auc?: number | null) => {
  if (auc === null || auc === undefined) return undefined;
  const word = auc >= 0.8 ? 'strong' : auc >= 0.7 ? 'good' : auc >= 0.6 ? 'fair' : 'weak';
  return `${word} predictor (AUC ${auc.toFixed(2)}, 0.5 = guessing)`;
};


/* ------------------------------------------------------------------ */
/* Vertical switch (Both / Zesty / Eventra)                            */
/* ------------------------------------------------------------------ */

export type Vertical = 'all' | 'zesty' | 'eventra';

export const VERTICAL_OPTIONS: { value: Vertical; label: string }[] = [
  { value: 'all', label: 'Both' },
  { value: 'zesty', label: 'Zesty' },
  { value: 'eventra', label: 'Eventra' },
];

const VERTICAL_KEY = 'platforma.intel.vertical';

/** The vertical the intelligence views are filtered to, remembered per browser. */
export function useStoredVertical(): [Vertical, (v: Vertical) => void] {
  const [vertical, setVertical] = useState<Vertical>(() => {
    try {
      const saved = window.localStorage.getItem(VERTICAL_KEY);
      return saved === 'zesty' || saved === 'eventra' ? saved : 'all';
    } catch {
      return 'all';
    }
  });
  const update = useCallback((v: Vertical) => {
    setVertical(v);
    try {
      window.localStorage.setItem(VERTICAL_KEY, v);
    } catch {
      // Storage unavailable (private mode): the choice just isn't remembered.
    }
  }, []);
  return [vertical, update];
}

/** Whether something covering `verticals` should show under the chosen filter. */
export const inVertical = (vertical: Vertical, covers: string[]) => vertical === 'all' || covers.includes(vertical);
