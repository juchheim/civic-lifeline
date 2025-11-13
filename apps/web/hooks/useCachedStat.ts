import { useEffect, useState } from "react";
import { getCachedStat, setCachedStat } from "@/utils/fetchStat";

type FetchState<T> = {
  data?: T;
  loading: boolean;
  error?: string;
  loaded: boolean;
};

export function useCachedStat<T>(
  cacheKey: string | null,
  fetcher: () => Promise<T>,
  deps: unknown[] = []
) {
  const [state, setState] = useState<FetchState<T>>({
    data: undefined,
    loading: Boolean(cacheKey),
    error: undefined,
    loaded: false,
  });

  useEffect(() => {
    if (!cacheKey) {
      setState({ data: undefined, loading: false, error: undefined, loaded: false });
      return;
    }

    let canceled = false;

    const cached = getCachedStat(cacheKey) as T | null;
    if (cached) {
      setState({ data: cached, loading: false, error: undefined, loaded: true });
      return () => {
        canceled = true;
      };
    }

    setState({ data: undefined, loading: true, error: undefined, loaded: false });

    (async () => {
      try {
        const data = await fetcher();
        if (canceled) return;
        setState({ data, loading: false, error: undefined, loaded: true });
        setCachedStat(cacheKey, data);
      } catch (error) {
        if (canceled) return;
        const message = error instanceof Error ? error.message : "Failed to load data";
        setState({ data: undefined, loading: false, error: message, loaded: true });
      }
    })();

    return () => {
      canceled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey, ...deps]);

  return state;
}
