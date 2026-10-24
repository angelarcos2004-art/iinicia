"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

/**
 * Barra de progreso que crece de 0 al valor real cuando entra en vista.
 * Bajo prefers-reduced-motion, globals.css fuerza el ancho final vía la
 * variable --pb-target sin necesidad de ramificar aquí.
 */
export function ProgressBar({ value, className }: { value: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setWidth(value);
        observer.disconnect();
      },
      { threshold: 0.3 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [value]);

  return (
    <div ref={ref} className={["h-2 w-full overflow-hidden rounded-full bg-surface-neutral", className].filter(Boolean).join(" ")}>
      <div
        className="progress-fill h-full rounded-full bg-secondary transition-[width] duration-1000 ease-out"
        style={{ width: `${width}%`, "--pb-target": `${value}%` } as CSSProperties}
      />
    </div>
  );
}
