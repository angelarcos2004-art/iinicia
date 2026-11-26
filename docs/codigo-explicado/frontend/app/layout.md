# `frontend/app/layout.tsx`

**En una frase:** es el molde que envuelve todas las páginas del portal: pone las fuentes, el encabezado, el pie de página, la barra de progreso de scroll y el `AuthProvider` que sabe quién inició sesión.

## Por qué existe
En Next.js (App Router), `layout.tsx` en la raíz de `app/` es obligatorio y se renderiza una sola vez alrededor de cualquier página (`page.tsx`) que el usuario visite. Es el lugar correcto para todo lo que debe existir en **todas** las pantallas del portal IINICIA: el header con el logo y el menú, el footer institucional, las fuentes tipográficas, los metadatos para buscadores (SEO), y el contexto de sesión (`AuthProvider`) que el resto de la app necesita para saber si hay alguien autenticado.

## Recorrido del código

```tsx
const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta-sans",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});
```
Next.js descarga estas dos fuentes de Google Fonts en tiempo de build y las expone como variables CSS (`--font-plus-jakarta-sans`, `--font-inter`). Esto evita el "parpadeo" de fuente que pasa cuando el navegador las pide en vivo: ya vienen optimizadas con el HTML.

```tsx
export const metadata: Metadata = {
  title: "IINICIA | Instituto de Innovación y Ciencias Aplicadas",
  description: "Portal institucional de IINICIA: oferta académica, admisiones y Mi IINICIA.",
};
```
`metadata` es una convención especial de Next.js: lo que pongas aquí se convierte automáticamente en las etiquetas `<title>` y `<meta name="description">` del `<head>`. Sirve para que el portal se vea bien cuando alguien lo comparte o lo busca en Google.

```tsx
const ORGANIZATION_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "CollegeOrUniversity",
  name: "IINICIA | Instituto de Innovación y Ciencias Aplicadas",
  ...
};
```
Esto es "datos estructurados": un bloque de JSON que los buscadores (Google) leen para mostrar información enriquecida (dirección, teléfono) directamente en los resultados de búsqueda, sin que el usuario tenga que entrar al sitio. No afecta nada visual; es puramente para SEO.

```tsx
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es-MX" className={`${plusJakartaSans.variable} ${inter.variable} h-full antialiased`}>
      <head>
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined..." />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ORGANIZATION_JSON_LD) }} />
      </head>
      <body className="min-h-full flex flex-col font-body text-ink">
        <a href="#main-content" className="sr-only focus:not-sr-only ...">
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
```
- `lang="es-MX"`: le dice al navegador y a lectores de pantalla que el contenido está en español de México (importante para accesibilidad y para que los traductores automáticos no se confundan).
- El enlace a `fonts.googleapis.com` carga la fuente de iconos "Material Symbols", que usa el componente `Icon` en todo el sitio.
- El `<a href="#main-content">` con clase `sr-only focus:not-sr-only` es un "enlace para saltar al contenido": invisible normalmente, pero aparece cuando alguien navega con teclado (Tab) y le permite saltarse el menú de navegación. Es un requisito básico de accesibilidad.
- Todo el contenido (`ScrollProgress`, `SiteHeader`, `{children}`, `SiteFooter`) está **dentro** de `<AuthProvider>`. Eso es intencional: así cualquier página o componente (como el header, que muestra "Hola, Nombre" si hay sesión) puede usar `useAuth()` para leer la sesión actual.
- `{children}` es donde Next.js inserta el contenido de la página activa (`page.tsx` de cada ruta).

## Conexión con el resto del sistema
- Envuelve a **todas** las páginas de `frontend/app/`.
- Usa `SiteHeader` y `SiteFooter` (`frontend/components/layout/`).
- Usa `ScrollProgress` (`frontend/components/ui/scroll-progress.tsx`).
- Envuelve todo en `AuthProvider` (`frontend/lib/auth-context.tsx`), que es lo que permite que `useAuth()` funcione en cualquier página hija.
- No llama directamente a ningún endpoint del backend.

## Cosas que no son obvias a primera vista
- El archivo no es `"use client"`: se ejecuta en el servidor (o en build), por eso puede exportar `metadata` sin problema. Los componentes que sí necesitan estado o efectos (`AuthProvider`, `ScrollProgress`, `SiteHeader`) están marcados como `"use client"` en sus propios archivos.
- El `<script type="application/ld+json">` con `dangerouslySetInnerHTML` no es un riesgo de seguridad aquí porque el contenido (`ORGANIZATION_JSON_LD`) es un objeto fijo definido en el propio código, no algo que venga de un usuario o del backend.
