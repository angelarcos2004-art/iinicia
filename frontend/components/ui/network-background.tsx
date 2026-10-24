"use client";

import { useEffect, useRef } from "react";

type Dot = { x: number; y: number; vx: number; vy: number };

/**
 * Fondo de puntos conectados (canvas) para el hero: evoca la red
 * académica/tecnológica del Instituto. Se omite por completo si el
 * visitante prefiere menos movimiento.
 *
 * shortcut: los colores están fijos a los mismos valores de
 * --color-primary/--color-secondary en globals.css; si esos tokens cambian,
 * actualizar aquí también.
 */
export function NetworkBackground({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = canvas?.parentElement;
    if (!canvas || !container) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let dots: Dot[] = [];
    const COUNT = 42;
    const LINK_DISTANCE = 140;

    function resize() {
      width = container!.clientWidth;
      height = container!.clientHeight;
      canvas!.width = width;
      canvas!.height = height;
    }

    function init() {
      dots = Array.from({ length: COUNT }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
      }));
    }

    resize();
    init();

    let frame: number;
    function tick() {
      ctx!.clearRect(0, 0, width, height);

      for (const dot of dots) {
        dot.x += dot.vx;
        dot.y += dot.vy;
        if (dot.x < 0 || dot.x > width) dot.vx *= -1;
        if (dot.y < 0 || dot.y > height) dot.vy *= -1;
      }

      for (let i = 0; i < dots.length; i++) {
        for (let j = i + 1; j < dots.length; j++) {
          const a = dots[i];
          const b = dots[j];
          const dist = Math.hypot(a.x - b.x, a.y - b.y);
          if (dist < LINK_DISTANCE) {
            ctx!.strokeStyle = `rgba(11, 42, 91, ${0.14 * (1 - dist / LINK_DISTANCE)})`;
            ctx!.lineWidth = 1;
            ctx!.beginPath();
            ctx!.moveTo(a.x, a.y);
            ctx!.lineTo(b.x, b.y);
            ctx!.stroke();
          }
        }
      }

      for (const dot of dots) {
        ctx!.fillStyle = "rgba(30, 90, 168, 0.4)";
        ctx!.beginPath();
        ctx!.arc(dot.x, dot.y, 2, 0, Math.PI * 2);
        ctx!.fill();
      }

      frame = requestAnimationFrame(tick);
    }
    tick();

    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={canvasRef} aria-hidden="true" className={className} />;
}
