import { useEffect, useRef } from "react";

type AutoRefreshOptions = {
  callback: () => void | Promise<void>;
  interval?: number;
  enabled?: boolean;
};

export default function useAutoRefresh({
  callback,
  interval = 2000,
  enabled = true,
}: AutoRefreshOptions) {
  const isRunningRef = useRef(false);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let cancelled = false;

    const runCallback = async () => {
      if (cancelled || document.hidden || isRunningRef.current) {
        return;
      }

      isRunningRef.current = true;

      try {
        await callback();
      } finally {
        isRunningRef.current = false;
      }
    };

    const timer = setInterval(() => {
      void runCallback();
    }, interval);

    const resume = () => { if (!document.hidden) void runCallback(); };
    document.addEventListener("visibilitychange", resume);

    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", resume);
      clearInterval(timer);
    };
  }, [callback, interval, enabled]);
}
