import { useEffect } from "react";

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
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const timer = setInterval(() => {
      callback();
    }, interval);

    return () => {
      clearInterval(timer);
    };
  }, [callback, interval, enabled]);
}