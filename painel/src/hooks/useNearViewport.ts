"use client";

import { useEffect, useRef, useState } from "react";

export default function useNearViewport(
  rootMargin = "600px 0px",
) {
  const elementRef =
    useRef<HTMLDivElement | null>(null);

  const [
    shouldLoad,
    setShouldLoad,
  ] = useState(false);

  useEffect(() => {
    const element =
      elementRef.current;

    if (!element || shouldLoad) {
      return;
    }

    if (
      typeof IntersectionObserver ===
      "undefined"
    ) {
      setShouldLoad(true);
      return;
    }

    const observer =
      new IntersectionObserver(
        (entries) => {
          const entry = entries[0];

          if (
            entry?.isIntersecting
          ) {
            setShouldLoad(true);
            observer.disconnect();
          }
        },
        {
          root: null,
          rootMargin,
          threshold: 0.01,
        },
      );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [
    rootMargin,
    shouldLoad,
  ]);

  return {
    elementRef,
    shouldLoad,
  };
}
