"use client";

import { useEffect, useRef, useState, type HTMLAttributes } from "react";

type RevealProps = {
  /** Retraso en ms, para escalonar varios Reveal dentro de una misma grilla. */
  delay?: number;
  /** "fade": fade + leve desplazamiento (por defecto). "zoom": fade + escala, para imágenes destacadas. */
  variant?: "fade" | "zoom";
} & HTMLAttributes<HTMLDivElement>;

/** Revela su contenido la primera vez que entra en el viewport. Respeta
 * prefers-reduced-motion mostrando el contenido fijo. */
export function Reveal({ children, className, delay = 0, variant = "fade", style, ...rest }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // prefers-reduced-motion: globals.css fuerza opacity/transform fijos en
    // .reveal sin importar este estado, así que no hace falta ramificar aquí.
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={[
        "reveal transition-all duration-[1300ms] ease-[cubic-bezier(0.16,1,0.3,1)]",
        variant === "zoom"
          ? visible
            ? "opacity-100 scale-100"
            : "opacity-0 scale-110"
          : visible
            ? "opacity-100 translate-y-0"
            : "opacity-0 translate-y-3",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      style={delay ? { ...style, transitionDelay: `${delay}ms` } : style}
      {...rest}
    >
      {children}
    </div>
  );
}
