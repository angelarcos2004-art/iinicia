# `frontend/app/page.tsx`

**En una frase:** es la página de inicio (home) del portal: el "landing" público con hero, oferta académica, testimonios, admisiones, noticias, preguntas frecuentes y el formulario de contacto.

## Por qué existe
Es lo primero que ve cualquier visitante que llega a `iinicia.edu.mx` sin haber iniciado sesión: tiene que convencerlo de que IINICIA es una institución real (por eso la sección de RVOE/acreditación), mostrarle la oferta académica, y empujarlo hacia `/registro`. Es contenido 100% público: no requiere sesión ni rol.

## Recorrido del código

### Datos de ejemplo versus datos reales
```tsx
const [programas, setProgramas] = useState<Programa[]>(MOCK_PROGRAMAS);

useEffect(() => {
  let cancelado = false;
  obtenerProgramas()
    .then((data) => {
      if (!cancelado) setProgramas(data);
    })
    .catch(() => {
      // Si falla con un error real (no "backend no disponible"), se queda con el
      // catálogo de respaldo ya cargado en vez de dejar la sección vacía.
    });
  return () => { cancelado = true; };
}, []);
```
La página arranca mostrando `MOCK_PROGRAMAS` (datos de ejemplo definidos en `frontend/lib/mock-data.ts`) para que la sección de oferta académica nunca esté vacía ni parpadee. En paralelo pide el catálogo real al backend con `obtenerProgramas()`. Si el backend contesta, reemplaza los datos de ejemplo por los reales. Si falla, se queda con los de ejemplo: es mejor mostrar algo plausible que una sección en blanco en una landing pública. La variable `cancelado` evita que, si el usuario navega a otra página antes de que la petición termine, el componente intente actualizar un estado que ya no existe (evita advertencias de React y fugas de memoria).

`ACREDITACION`, `TESTIMONIOS` y `NOTICIAS` siguen el mismo criterio: son datos de ejemplo explícitos en el código (comentados como tales), pensados para sustituirse por datos reales de la institución más adelante, nunca presentados como un hecho verificado si no lo son.

### Parallax e interacción del hero
```tsx
useEffect(() => {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  function onScroll() {
    setHeroOffset(Math.min(window.scrollY * 0.15, 60));
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  return () => window.removeEventListener("scroll", onScroll);
}, []);
```
Mueve la imagen de fondo del hero un poco más lento que el scroll (efecto "parallax"), limitado a 60px para que no se note demasiado. Antes de nada, revisa `prefers-reduced-motion`: si el visitante configuró su sistema para evitar animaciones (por mareo, por accesibilidad), esta función ni siquiera se activa.

```tsx
function handleHeroMouseMove(event: MouseEvent<HTMLElement>) {
  const rect = heroRef.current?.getBoundingClientRect();
  if (!rect || !heroRef.current) return;
  heroRef.current.style.setProperty("--spot-x", `${((event.clientX - rect.left) / rect.width) * 100}%`);
  heroRef.current.style.setProperty("--spot-y", `${((event.clientY - rect.top) / rect.height) * 100}%`);
}
```
Crea un foco de luz que sigue al cursor sobre el hero. En vez de usar `setState` (que forzaría un re-render de React en cada movimiento del mouse, carísimo), escribe directamente dos variables CSS (`--spot-x`, `--spot-y`) en el elemento con `style.setProperty`. El CSS (en `globals.css` / clases de Tailwind) usa esas variables en un `radial-gradient`. Es una técnica deliberada para animaciones de alta frecuencia: tocar el DOM directo es mucho más barato que pasar por el ciclo de render de React.

### Filtro de programas por tipo
```tsx
function toggleTipo(tipo: TipoPrograma) {
  setTiposActivos((prev) => {
    const next = new Set(prev);
    if (next.has(tipo)) next.delete(tipo);
    else next.add(tipo);
    return next;
  });
}

const programasFiltrados = useMemo(() => {
  if (tiposActivos.size === 0) return programas;
  return programas.filter((programa) => tiposActivos.has(programa.tipo));
}, [tiposActivos, programas]);
```
Los botones "Licenciaturas / Diplomados / Certificaciones" guardan sus selecciones en un `Set` (sin duplicados, búsqueda rápida). Si no hay ningún filtro activo se muestran todos los programas; si hay uno o más, solo los que coincidan. `useMemo` evita recalcular el filtrado en cada render si ni `tiposActivos` ni `programas` cambiaron.

### Formulario de contacto (todavía sin backend propio)
```tsx
// Este formulario todavía no tiene un endpoint propio en el backend
// (solo existe /auth/login y /auth/registro); por ahora solo valida en
// cliente y simula el envío para no bloquear la experiencia del portal.
function handleSubmit(event: FormEvent<HTMLFormElement>) {
  event.preventDefault();
  setEnviando(true);
  setTimeout(() => {
    setEnviando(false);
    setEnviado(true);
  }, 500);
}
```
El formulario de "Contacto" no llama a ningún endpoint real: simula un envío con un `setTimeout` de 500ms y muestra el mensaje de éxito. Es una decisión explícita documentada en el propio comentario: el backend todavía no tiene una ruta para mensajes de contacto, así que en vez de romper la experiencia (o mentir con un endpoint falso) se deja claro en el código que es simulado.

## Conexión con el resto del sistema
- Llama a `GET /programas` (público, sin token) a través de `obtenerProgramas()` en `frontend/lib/api.ts`.
- Usa datos de respaldo de `frontend/lib/mock-data.ts` (`MOCK_PROGRAMAS`) si el backend no responde.
- Usa casi todos los componentes de `frontend/components/ui/`: `Badge`, `Button`/`ButtonLink`, `Card`, `CountUp`, `Icon`, `Input`, `NetworkBackground`, `ProgressBar`, `Reveal`, `Select`, `SectionBg`.
- Enlaza a `/registro` (botones de CTA) y a anclas internas (`#oferta-academica`, `#admisiones`, etc.) que también usa `SiteHeader` para resaltar la sección activa en el menú.

## Cosas que no son obvias a primera vista
- El formulario de contacto no manda nada al backend todavía; es intencional y está documentado en el propio código, no es un bug.
- Los testimonios, noticias y el acuerdo de RVOE son contenido de ejemplo explícito, no datos reales verificados; deben sustituirse antes de usarse en producción con información institucional real.
- Nada en esta página valida roles ni requiere sesión: es la única pantalla pensada para verse igual sin importar quién la visite.
