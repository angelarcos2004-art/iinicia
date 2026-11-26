# `frontend/components/layout/site-header.tsx`

**En una frase:** el encabezado fijo del portal: logo, menú de navegación que resalta la sección visible, enlaces a los paneles administrativos según el rol, y el botón de iniciar/cerrar sesión; con una versión plegable para móvil.

## Por qué existe
Aparece en todas las páginas (se monta desde `frontend/app/layout.tsx`) y es el único lugar del portal que decide, en tiempo real, qué enlaces mostrar según si hay sesión activa y qué rol tiene. También resuelve un problema puramente de UX: en una landing de una sola página con muchas secciones (`app/page.tsx`), hay que indicarle al visitante en qué parte de la página está mientras hace scroll.

## Recorrido del código

### Encabezado que se "encoge" al bajar
```tsx
const [scrolled, setScrolled] = useState(false);
...
useEffect(() => {
  function onScroll() {
    setScrolled(window.scrollY > 24);
  }
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });
  return () => window.removeEventListener("scroll", onScroll);
}, []);
```
Pasados 24px de scroll, `scrolled` se vuelve `true` y varias clases cambian (el logo pasa de `h-20 w-20` a `h-14 w-14`, el padding vertical del header se reduce de `py-3` a `py-1.5`, y aparece una sombra). Es un efecto puramente visual para que el header ocupe menos espacio una vez que el usuario ya empezó a leer el contenido.

### Resaltar la sección visible en el menú
```tsx
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
```
Este efecto solo corre en la página de inicio (`pathname === "/"`), porque es la única que tiene las secciones con id (`#inicio`, `#universidad`, etc.) a las que apuntan los enlaces del menú. `rootMargin: "-45% 0px -50% 0px"` reduce drásticamente la zona de detección a una franja angosta cerca del centro vertical de la pantalla: en vez de marcar como "activa" cualquier sección apenas visible en cualquier borde, solo se considera activa la sección que está pasando por el centro de la ventana, que es la que el usuario está leyendo realmente en ese momento.

### El indicador deslizante bajo el link activo
```tsx
const navRef = useRef<HTMLElement>(null);
const linkRefs = useRef<Record<string, HTMLAnchorElement | null>>({});
const [indicator, setIndicator] = useState<{ left: number; width: number } | null>(null);

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
```
En vez de que cada `<Link>` del menú tenga su propio subrayado con CSS (que "saltaría" de golpe de un link a otro), hay un único elemento `<span>` absoluto que se reposiciona con JavaScript para quedar exactamente debajo del link activo (`activeId`), y una transición CSS (`transition-all duration-300`) hace que ese movimiento se vea como un deslizamiento continuo entre posiciones. `linkRefs` guarda, por id de sección, la referencia al elemento `<a>` real de cada link, para poder medir su posición (`getBoundingClientRect`) relativa al contenedor de la navegación (`navRef`). Si la ventana cambia de tamaño, las posiciones se recalculan.

### Qué paneles administrativos ve cada rol
```tsx
const ROLES_CON_PANEL_ADMIN = ["superadmin", "admin_academico", "coordinador"];
const ROLES_CON_PANEL_PROGRAMAS = ["superadmin", "admin_academico", "coordinador"];
const ROLES_CON_PANEL_MATERIAS = ["superadmin", "admin_academico"];
```
Estas listas deciden, dentro del bloque `{sesion ? (...) : (...)}`, qué enlaces aparecen junto al nombre del usuario y el botón de cerrar sesión. Nótese que estas listas son solo para decidir qué **enlace** mostrar (la conveniencia de no mostrar un link a una pantalla a la que el usuario de todos modos no puede entrar); la protección real de cada ruta vive en la página correspondiente (`app/admin/*/page.tsx`), que vuelve a comprobar el rol y redirige si no corresponde.

### Menú móvil
```tsx
<nav
  id="mobile-menu"
  aria-hidden={!menuOpen}
  className={[
    "flex flex-col gap-1 overflow-hidden ... transition-all duration-300 ... xl:hidden",
    menuOpen ? "max-h-[28rem] py-space-md opacity-100" : "max-h-0 py-0 opacity-0 pointer-events-none",
  ].join(" ")}
>
```
En pantallas angostas (por debajo del breakpoint `xl`), el menú de escritorio se oculta y aparece un botón de hamburguesa que alterna `menuOpen`. El menú móvil no se monta/desmonta del DOM: siempre está presente, pero colapsado a `max-h-0` y `opacity-0` con `pointer-events-none` (para que no se pueda interactuar con él ni por teclado mientras está "cerrado"). Animar `max-height` en vez de usar `display: none` es lo que permite la transición suave de apertura/cierre; con `display: none` el cambio sería instantáneo, sin animación posible.

```tsx
style={{ transitionDelay: menuOpen ? `${i * 35}ms` : "0ms" }}
```
Cada link del menú móvil se anima con un pequeño retraso creciente según su posición (`i * 35ms`), para que aparezcan en cascada de arriba hacia abajo en vez de todos a la vez.

## Conexión con el resto del sistema
- Usa `useAuth()` de `frontend/lib/auth-context.tsx` para leer `sesion` y llamar `logout()`.
- Usa `Button`/`ButtonLink` de `frontend/components/ui/button.tsx`.
- Enlaza a `/`, `/login`, `/registro`, `/mi-iinicia`, `/admin/usuarios`, `/admin/programas`, `/admin/materias`, y a las anclas de la home (`/#inicio`, `/#universidad`, etc.).
- Se monta una sola vez desde `frontend/app/layout.tsx`.

## Cosas que no son obvias a primera vista
- El resaltado de sección activa (scroll-spy) solo funciona en la página de inicio; en cualquier otra ruta, el efecto que lo calcula se detiene de inmediato (`if (pathname !== "/") return;`) porque esas páginas no tienen las secciones con esos ids.
- Mostrar u ocultar un enlace al panel admin según el rol es solo una conveniencia visual: no reemplaza la verificación de rol que cada página hace por su cuenta al cargar, ni la que el backend hace en cada endpoint.
- `handleLogout` siempre redirige a `/` tras cerrar sesión, sin importar en qué página estaba el usuario, para no dejarlo en una pantalla que ya no debería poder ver sin sesión.
