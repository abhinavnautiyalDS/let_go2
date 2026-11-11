"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export function useLandingNavigation() {
  const router = useRouter();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const transitionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onBegin = useCallback(
    (event: React.MouseEvent<HTMLAnchorElement>) => {
      event.preventDefault();
      if (isTransitioning) return;

      setIsTransitioning(true);
      transitionTimer.current = setTimeout(() => {
        router.push("/ritual");
      }, 260);
    },
    [isTransitioning, router],
  );

  useEffect(
    () => () => {
      if (transitionTimer.current) clearTimeout(transitionTimer.current);
    },
    [],
  );

  return { isTransitioning, onBegin };
}
