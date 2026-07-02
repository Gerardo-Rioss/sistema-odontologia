"use client";

import { useState, useEffect, useRef } from "react";

/**
 * Hook que anima un número de 0 al valor final usando easeOutCubic.
 * Solo anima valores numéricos; retorna strings sin modificar.
 *
 * @param end - Valor final (number o string)
 * @param duration - Duración en ms (default: 800)
 * @returns Valor animado (número si era numérico, string si no)
 */
export function useCountUp(
  end: number | string,
  duration = 800
): number | string {
  const previousEnd = useRef(end);
  const [count, setCount] = useState(0);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    // Si el valor es string (ej. "85%"), lo devolvemos tal cual
    if (typeof end === "string") {
      setCount(0); // dummy, no se usa
      return;
    }

    // Si no cambió, no re-animar
    if (end === previousEnd.current && count === end) return;
    previousEnd.current = end;

    let startTime: number | null = null;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // easeOutCubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * end));

      if (progress < 1) {
        frameRef.current = requestAnimationFrame(animate);
      }
    };

    frameRef.current = requestAnimationFrame(animate);

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [end, duration]);

  return typeof end === "string" ? end : count;
}
