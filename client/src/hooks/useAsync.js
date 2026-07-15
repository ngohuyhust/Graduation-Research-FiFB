// Hook use async dung lai logic trong component.
import { useCallback, useEffect, useRef, useState } from "react";
import { getErrorMessage } from "../utils/errors";

export function useAsync(loader, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const mountedRef = useRef(false);
  const requestIdRef = useRef(0);

  const execute = useCallback(async (...args) => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setLoading(true);
    setError("");
    try {
      const result = await loader(...args);
      if (mountedRef.current && requestIdRef.current === requestId) {
        setData(result);
        setLoading(false);
      }
      return result;
    } catch (err) {
      if (mountedRef.current && requestIdRef.current === requestId) {
        setError(getErrorMessage(err));
        setLoading(false);
      }
      return null;
    }
    // The caller controls reload timing with deps, matching page-level API params.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  const cancel = useCallback(() => {
    requestIdRef.current += 1;
    if (mountedRef.current) setLoading(false);
  }, []);

  const reset = useCallback(() => {
    requestIdRef.current += 1;
    if (!mountedRef.current) return;
    setData(null);
    setError("");
    setLoading(false);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    execute();
    return () => {
      mountedRef.current = false;
      requestIdRef.current += 1;
    };
  }, [execute]);

  return { data, loading, error, execute, reload: execute, reset, cancel, setData };
}
