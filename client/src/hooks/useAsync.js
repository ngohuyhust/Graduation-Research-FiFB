import { useEffect, useState } from "react";
import { getErrorMessage } from "../utils/errors";

export function useAsync(loader, deps = []) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function run() {
    setLoading(true);
    setError("");
    try {
      setData(await loader());
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    run();
    // The caller controls reload timing with deps, matching page-level API params.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, loading, error, reload: run, setData };
}
