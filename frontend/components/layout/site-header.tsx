"use client";

import Link from "next/link";
import { useState } from "react";
import { Logo } from "@/components/logo";
import { ButtonLink } from "@/components/ui/button";

const NAV_LINKS = [
  { href: "/", label: "Inicio" },
  { href: "/oferta-academica", label: "Oferta académica" },
];

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border-subtle bg-surface-canvas/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-margin-mobile py-3 md:px-margin-desktop">
        <Link href="/" className="flex items-center" aria-label="IINICIA, ir al inicio">
          <Logo className="h-10 w-auto" />
        </Link>

        <nav className="hidden items-center gap-8 lg:flex" aria-label="Navegación principal">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-label-md font-display font-semibold text-ink-muted transition-colors hover:text-secondary"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <ButtonLink href="/login" variant="outline" className="h-11 px-5">
            Mi Campus
          </ButtonLink>
          <ButtonLink href="/registro" variant="primary" className="h-11 px-5">
            Registrarme
          </ButtonLink>
        </div>

        <button
          type="button"
          className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-border-subtle text-primary lg:hidden"
          aria-label={menuOpen ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span className="sr-only">Menú</span>
          <svg
            viewBox="0 0 24 24"
            className="h-6 w-6"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            {menuOpen ? <path d="M6 6l12 12M18 6l-12 12" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </div>

      {menuOpen && (
        <nav
          id="mobile-menu"
          aria-label="Navegación móvil"
          className="flex flex-col gap-1 border-t border-border-subtle bg-surface-canvas px-margin-mobile py-space-md lg:hidden"
        >
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-md px-3 py-2.5 text-label-lg font-display font-semibold text-ink hover:bg-surface-subtle"
              onClick={() => setMenuOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <div className="mt-2 flex flex-col gap-2">
            <ButtonLink href="/login" variant="outline" onClick={() => setMenuOpen(false)}>
              Mi Campus
            </ButtonLink>
            <ButtonLink href="/registro" variant="primary" onClick={() => setMenuOpen(false)}>
              Registrarme
            </ButtonLink>
          </div>
        </nav>
      )}
    </header>
  );
}
