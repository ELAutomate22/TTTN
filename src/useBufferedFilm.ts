import { useEffect, useState } from 'react';

// A complete local Blob prevents scroll seeks from triggering network range
// requests. Keep the original 1080p frames; never cache decoded frames in JS.
export function useBufferedFilm(enabled: boolean) {
  const [source, setSource] = useState<string>();
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    setSource(undefined);
    if (!enabled) return;
    const controller = new AbortController();
    let objectUrl: string | undefined;
    let disposed = false;
    let retryTimer = 0;
    let busy = false;
    let failures = 0;
    const load = async () => {
      if (busy || objectUrl || disposed) return;
      busy = true;
      setFailed(false);
      const timeout = window.setTimeout(() => controller.abort(), 120_000);
      try {
        const response = await fetch('/media/tttn-earth-london-seek.mp4', { signal: controller.signal });
        if (!response.ok) throw new Error('Film download failed');
        const blob = await response.blob();
        if (disposed) return;
        objectUrl = URL.createObjectURL(blob);
        setSource(objectUrl);
      } catch {
        if (disposed) return;
        setFailed(true);
        if (++failures < 3 && !controller.signal.aborted) retryTimer = window.setTimeout(load, failures * 2000);
      } finally {
        clearTimeout(timeout);
        busy = false;
      }
    };
    const online = () => { if (!controller.signal.aborted) void load(); };
    void load();
    window.addEventListener('online', online);
    return () => {
      disposed = true;
      controller.abort();
      clearTimeout(retryTimer);
      window.removeEventListener('online', online);
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [enabled, attempt]);
  return {
    source, failed,
    retry: () => setAttempt(value => value + 1),
    // Some media engines reject Blob-backed MP4. The preceding fetch has
    // warmed HTTP cache; fall back to native media loading instead of hiding it.
    useNativeSource: () => setSource('/media/tttn-earth-london-seek.mp4'),
  };
}
