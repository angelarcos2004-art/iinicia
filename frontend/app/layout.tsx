import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { ScrollProgress } from "@/components/ui/scroll-progress";
import { AuthProvider } from "@/lib/auth-context";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta-sans",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "IINICIA | Instituto de Innovación y Ciencias Aplicadas",
  description:
    "Portal institucional de IINICIA: oferta académica, admisiones y Mi IINICIA.",
};

/** Permite que buscadores muestren datos de contacto institucional en resultados enriquecidos. */
const ORGANIZATION_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "CollegeOrUniversity",
  name: "IINICIA | Instituto de Innovación y Ciencias Aplicadas",
  email: "contacto@iinicia.edu.mx",
  telephone: "+52-55-5000-2400",
  address: {
    "@type": "PostalAddress",
    streetAddress: "Av. Insurgentes Sur 1602, Col. Crédito Constructor",
    addressLocality: "Ciudad de México",
    postalCode: "03940",
    addressCountry: "MX",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es-MX"
      className={`${plusJakartaSans.variable} ${inter.variable} h-full antialiased`}
    >
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,300..600,0..1,-25..0"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(ORGANIZATION_JSON_LD) }}
        />
      </head>
      <body className="min-h-full flex flex-col font-body text-ink">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-body-sm focus:font-semibold focus:text-white"
        >
          Saltar al contenido principal
        </a>
        <AuthProvider>
          <ScrollProgress />
          <SiteHeader />
          <main id="main-content" className="flex-1">
            {children}
          </main>
          <SiteFooter />
        </AuthProvider>
      </body>
    </html>
  );
}
