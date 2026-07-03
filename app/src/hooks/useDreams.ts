import { useEffect, useState } from "react";
import { loadDreams, DREAMS_BASE, type Dreams } from "../lib/dreams";

export function useDreams() {
  const [dreams, setDreams] = useState<Dreams | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    loadDreams(DREAMS_BASE)
      .then((d) => { if (alive) setDreams(d); })
      .catch((e) => { if (alive) setError(String(e)); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  return { dreams, error, loading };
}
