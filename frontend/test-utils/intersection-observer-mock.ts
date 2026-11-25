import { vi } from "vitest";

/**
 * Reemplaza el stub no-op de IntersectionObserver (vitest.setup.ts) por uno controlable: guarda
 * el callback de la última instancia creada para que el test dispare la intersección a mano
 * (jsdom nunca la dispara solo). Úsalo en componentes que dependen de ella para animarse
 * (Reveal, CountUp, ProgressBar).
 */
export function installControllableIntersectionObserver() {
  let ultimoCallback: IntersectionObserverCallback | null = null;

  class ControllableIntersectionObserver {
    constructor(callback: IntersectionObserverCallback) {
      ultimoCallback = callback;
    }
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
  }

  vi.stubGlobal("IntersectionObserver", ControllableIntersectionObserver);

  return {
    /** Dispara la intersección (isIntersecting=true por defecto) en el último observer creado. */
    dispararInterseccion(isIntersecting = true) {
      ultimoCallback?.(
        [{ isIntersecting } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      );
    },
  };
}
