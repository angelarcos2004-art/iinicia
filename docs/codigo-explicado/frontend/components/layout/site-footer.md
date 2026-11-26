# `frontend/components/layout/site-footer.tsx`

**En una frase:** el pie de página institucional del portal: logo, enlaces de navegación agrupados, datos de contacto directo y el aviso de copyright.

## Por qué existe
Igual que `SiteHeader`, se monta una sola vez desde el layout raíz y aparece en todas las páginas, dando un cierre visual consistente y los mismos enlaces de salida (contacto, cuenta) sin importar en qué pantalla esté el usuario.

## Recorrido del código

```tsx
const INSTITUCIONAL_LINKS = [
  { href: "/#inicio", label: "Inicio" },
  { href: "/#universidad", label: "Universidad" },
  { href: "/#oferta-academica", label: "Oferta académica" },
  { href: "/#admisiones", label: "Admisiones" },
  { href: "/#noticias", label: "Noticias" },
];

const CUENTA_LINKS = [
  { href: "/registro", label: "Registrarme" },
  { href: "/login", label: "Mi Campus" },
  { href: "/#contacto", label: "Contacto" },
];

const CURRENT_YEAR = 2026;
```
No hay estado, efectos ni llamadas al backend: es un componente estático. Los enlaces están agrupados en dos listas (secciones institucionales de la home vs. accesos de cuenta) que se recorren con `.map()` para generar cada `<li>`, en vez de escribir cada enlace a mano repetidas veces.

`CURRENT_YEAR` está fijo como un número literal (`2026`) en vez de calcularse con `new Date().getFullYear()`. Es una decisión simple y predecible para esta primera entrega: evita que el año mostrado cambie solo (y potencialmente quede desincronizado de otros lugares del sitio) sin que alguien lo revise; se tendrá que actualizar a mano en entregas futuras.

## Conexión con el resto del sistema
- Se monta una sola vez desde `frontend/app/layout.tsx`, junto a `SiteHeader`.
- Enlaza a las mismas anclas de la home que usa `SiteHeader` (`/#inicio`, `/#universidad`, etc.) y a `/registro`, `/login`, `/#contacto`.
- No usa ningún otro componente del proyecto ni llama a ningún endpoint.

## Cosas que no son obvias a primera vista
- El año del copyright es un valor fijo en el código, no calculado dinámicamente; alguien debe actualizarlo manualmente en años futuros.
- A diferencia de `SiteHeader`, este componente no necesita `"use client"`: no tiene estado, efectos ni nada que dependa del navegador, así que puede renderizarse completamente en el servidor.
