import { useCallback, useEffect, useState } from "react";
import type { ExperimentalRpcQueryState } from "@get-bb/plugin-sdk/app";
import { errorMessage } from "./reader-error";

/** One-shot reads for source selection and form data. */
export function useQuery<T>(load: (() => Promise<T>) | null) {
  const [version, setVersion] = useState(0);
  const [state, setState] = useState<{
    owner: typeof load;
    data?: T;
    error?: string;
  }>({ owner: null });
  const refresh = useCallback(() => setVersion((value) => value + 1), []);
  useEffect(() => {
    if (!load) return;
    let disposed = false;
    let running = false;
    async function run() {
      if (running || disposed || document.visibilityState === "hidden") return;
      running = true;
      try {
        const data = await load!();
        if (!disposed) setState({ owner: load, data });
      } catch (cause) {
        if (!disposed)
          setState((previous) => ({
            owner: load,
            data: previous.owner === load ? previous.data : undefined,
            error: errorMessage(cause),
          }));
      } finally {
        running = false;
      }
    }
    void run();
    const onVisible = () => {
      if (document.visibilityState === "visible") void run();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      disposed = true;
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [load, version]);
  return {
    data: state.owner === load ? state.data : undefined,
    error: state.owner === load ? state.error : undefined,
    refresh,
  };
}

export function liveQueryView<T>(query: ExperimentalRpcQueryState<T>) {
  return {
    data: query.data,
    error: query.error?.message,
    refresh: () => {
      void query.refetch();
    },
  };
}
