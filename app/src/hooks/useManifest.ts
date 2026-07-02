import { useEffect, useState } from "react";
import { loadManifest, type Manifest } from "../lib/manifest";
import { ARTIFACT_BASE } from "../lib/artifact";

export function useManifest() {
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    loadManifest(ARTIFACT_BASE)
      .then((m) => { if (alive) setManifest(m); })
      .catch((e) => { if (alive) setError(String(e)); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  return { manifest, error, loading };
}
