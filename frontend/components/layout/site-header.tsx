"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";

const NAV_LINKS = [
  { href: "/#inicio", label: "Inicio" },
  { href: "/#universidad", label: "Universidad" },
  { href: "/#oferta-academica", label: "Oferta académica" },
  { href: "/#admisiones", label: "Admisiones" },
  { href: "/#noticias", label: "Noticias" },
  { href: "/#contacto", label: "Contacto" },
];

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const { sesion, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  /** Encoge el header (logo y padding) al bajar, para una sensación más premium. */
  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 24);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /** Resalta en el menú la sección visible al hacer scroll en la landing. */
  useEffect(() => {
    if (pathname !== "/") return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.find((entry) => entry.isIntersecting);
        if (visible) setActiveId(visible.target.id);
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );

    NAV_LINKS.forEach((link) => {
      const el = document.getElementById(link.href.split("#")[1]);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [pathname]);

  const navRef = useRef<HTMLElement>(null);
  const linkRefs = useRef<Record<string, HTMLAnchorElement | null>>({});
  const [indicator, setIndicator] = useState<{ left: number; width: number } | null>(null);

  /** Posiciona el indicador deslizante bajo el link de la sección activa. */
  useEffect(() => {
    function updateIndicator() {
      const nav = navRef.current;
      const link = activeId ? linkRefs.current[activeId] : null;
      if (!nav || !link) {
        setIndicator(null);
        return;
      }
      const navRect = nav.getBoundingClientRect();
      const linkRect = link.getBoundingClientRect();
      setIndicator({ left: linkRect.left - navRect.left, width: linkRect.width });
    }
    updateIndicator();
    window.addEventListener("resize", updateIndicator);
    return () => window.removeEventListener("resize", updateIndicator);
  }, [activeId]);

  function handleLogout() {
    logout();
    setMenuOpen(false);
    router.push("/");
  }

  return (
    <header
      className={[
        "sticky top-0 z-50 border-b border-border-subtle bg-surface-canvas/95 backdrop-blur-sm transition-shadow duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
        scrolled && "shadow-level-2",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div
        className={[
          "mx-auto flex max-w-7xl items-center justify-between gap-4 px-margin-mobile transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] md:px-margin-desktop",
          scrolled ? "py-1.5" : "py-3",
        ].join(" ")}
      >
        <Link href="/" className="flex items-center" aria-label="IINICIA, ir al inicio">
          <span
            className={[
              "flex items-center justify-center overflow-hidden rounded-lg border border-border-subtle bg-[#f6f5f3] p-1 shadow-level-1 transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
              scrolled ? "h-14 w-14" : "h-20 w-20",
            ].join(" ")}
          >
            <Image
              src="/logo-iinicia-oscuro-letras.jpg"
              alt="IINICIA, Instituto de Innovación y Ciencias Aplicadas"
              width={1024}
              height={1024}
              className="h-full w-full rounded object-cover"
              priority
            />
          </span>
        </Link>

        <nav ref={navRef} className="relative hidden items-center gap-5 xl:flex" aria-label="Navegación principal">
          {indicator && (
            <span
              aria-hidden="true"
              className="absolute -bottom-2 h-[2px] rounded-full bg-secondary transition-all duration-300 ease-out"
              style={{ left: indicator.left, width: indicator.width }}
            />
          )}
          {NAV_LINKS.map((link) => {
            const id = link.href.split("#")[1];
            return (
              <Link
                key={link.href}
                href={link.href}
                ref={(el) => {
                  linkRefs.current[id] = el;
                }}
                aria-current={activeId === id ? "true" : undefined}
                className={[
                  "text-label-md font-display font-semibold transition-colors hover:text-secondary",
                  activeId === id ? "text-secondary" : "text-ink-muted",
                ].join(" ")}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-3 xl:flex">
          {sesion ? (
            <>
              <Link
                href="/mi-iinicia"
                className="text-label-md font-display font-semibold text-ink hover:text-secondary"
              >
                Hola, {sesion.usuario.nombre.split(" ")[0]}
              </Link>
              <Button variant="outline" className="h-11 px-5" onClick={handleLogout}>
                Cerrar sesión
              </Button>
            </>
          ) : (
            <>
              <ButtonLink href="/login" variant="outline" className="h-11 px-5">
                Mi Campus
              </ButtonLink>
              <ButtonLink href="/registro" variant="primary" className="h-11 px-5">
                Registrarme
              </ButtonLink>
            </>
          )}
        </div>

        <button
          type="button"
          className="relative inline-flex h-11 w-11 items-center justify-center rounded-md border border-border-subtle text-primary xl:hidden"
          aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span className="sr-only">Menú</span>
          <svg
            viewBox="0 0 24 24"
            className={[
              "absolute h-6 w-6 transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
              menuOpen ? "rotate-90 opacity-0" : "rotate-0 opacity-100",
            ].join(" ")}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <path d="M4 7h16M4 12h16M4 17h16" />
          </svg>
          <svg
            viewBox="0 0 24 24"
            className={[
              "absolute h-6 w-6 transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
              menuOpen ? "rotate-0 opacity-100" : "-rotate-90 opacity-0",
            ].join(" ")}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <path d="M6 6l12 12M18 6l-12 12" />
          </svg>
        </button>
      </div>

      <nav
        id="mobile-menu"
        aria-label="Navegación móvil"
        aria-hidden={!menuOpen}
        className={[
          "flex flex-col gap-1 overflow-hidden border-t border-border-subtle bg-surface-canvas px-margin-mobile transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] xl:hidden",
          menuOpen ? "max-h-[28rem] py-space-md opacity-100" : "max-h-0 py-0 opacity-0 pointer-events-none",
        ].join(" ")}
      >
        {NAV_LINKS.map((link, i) => (
          <Link
            key={link.href}
            href={link.href}
            className={[
              "rounded-md px-3 py-2.5 text-label-lg font-display font-semibold text-ink transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] hover:bg-surface-subtle",
              menuOpen ? "translate-x-0 opacity-100" : "-translate-x-2 opacity-0",
            ].join(" ")}
            style={{ transitionDelay: menuOpen ? `${i * 35}ms` : "0ms" }}
            onClick={() => setMenuOpen(false)}
          >
            {link.label}
          </Link>
        ))}
        <div
          className={[
            "mt-2 flex flex-col gap-2 transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
            menuOpen ? "translate-x-0 opacity-100" : "-translate-x-2 opacity-0",
          ].join(" ")}
          style={{ transitionDelay: menuOpen ? `${NAV_LINKS.length * 35}ms` : "0ms" }}
        >
          {sesion ? (
            <>
              <Link
                href="/mi-iinicia"
                className="rounded-md px-3 py-2.5 text-label-lg font-display font-semibold text-ink hover:bg-surface-subtle"
                onClick={() => setMenuOpen(false)}
              >
                Hola, {sesion.usuario.nombre.split(" ")[0]}
              </Link>
              <Button variant="outline" onClick={handleLogout}>
                Cerrar sesión
              </Button>
            </>
          ) : (
            <>
              <ButtonLink href="/login" variant="outline" onClick={() => setMenuOpen(false)}>
                Mi Campus
              </ButtonLink>
              <ButtonLink href="/registro" variant="primary" onClick={() => setMenuOpen(false)}>
                Registrarme
              </ButtonLink>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
