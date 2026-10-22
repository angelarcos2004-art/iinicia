import Link from "next/link";
import { Logo } from "@/components/logo";

const SITEMAP_LINKS = [
  { href: "/", label: "Inicio" },
  { href: "/oferta-academica", label: "Oferta académica" },
  { href: "/registro", label: "Registrarme" },
  { href: "/login", label: "Mi Campus" },
];

const CURRENT_YEAR = 2026;

export function SiteFooter() {
  return (
    <footer className="bg-primary text-white">
      <div className="mx-auto max-w-7xl px-margin-mobile py-space-xl md:px-margin-desktop">
        <div className="grid grid-cols-1 gap-10 border-b border-white/15 pb-10 md:grid-cols-3">
          <div className="flex flex-col gap-3">
            <Logo variant="dark" className="h-10 w-auto" />
            <p className="max-w-sm text-body-sm text-white/80">
              Institución de educación superior en línea comprometida con la
              excelencia académica y la accesibilidad tecnológica.
            </p>
          </div>

          <div>
            <h3 className="mb-4 text-headline-sm font-display font-bold">Mapa del sitio</h3>
            <ul className="space-y-2.5 text-body-sm">
              {SITEMAP_LINKS.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-white/80 transition-colors hover:text-white">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="mb-4 text-headline-sm font-display font-bold">Contacto</h3>
            <ul className="space-y-2.5 text-body-sm text-white/80">
              <li>
                <a className="hover:text-white" href="tel:+525589427000">
                  +52 (55) 8942-7000
                </a>
              </li>
              <li>
                <a className="hover:text-white" href="mailto:admisiones@iinicia.edu.mx">
                  admisiones@iinicia.edu.mx
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-3 pt-6 text-center text-body-sm text-white/70 md:flex-row md:text-left">
          <p>
            © {CURRENT_YEAR} Instituto de Innovación y Ciencias Aplicadas (IINICIA). Todos
            los derechos reservados.
          </p>
          <p className="text-label-sm uppercase tracking-wide text-white/60">
            Primera entrega · Estructura y diseño del portal
          </p>
        </div>
      </div>
    </footer>
  );
}
