# `frontend/components/ui/scroll-progress.tsx`

**En una frase:** la línea delgada y fija en la parte superior de toda la pantalla que muestra, con su ancho, qué tanto se ha recorrido de la página actual.

## Por qué existe
Es un indicador visual simple de "cuánto falta" en páginas largas como la home (que tiene muchas secciones: hero, universidad, oferta académica, testimonios, admisiones, noticias, FAQ, contacto). Vive en el layout raíz, así que aparece en absolutamente todas las páginas del portal, no solo en la home.

## Recorrido del código

```tsx
export function ScrollProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    function onScroll() {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(scrollable > 0 ? (window.scrollY / scrollable) * 100 : 0);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <div className="fixed inset-x-0 top-0 z-[60] h-[3px]" aria-hidden="true">
      <div
        className="h-full bg-gradient-to-r from-secondary to-accent transition-[width] duration-150 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
```
- `document.documentElement.scrollHeight - window.innerHeight` calcula cuánto se puede desplazar la página en total (el alto completo del documento menos lo que ya es visible en la ventana). Si una página es tan corta que no se puede hacer scroll (`scrollable <= 0`), el progreso se fija en `0` para evitar una división entre cero o un valor sin sentido.
- `window.scrollY / scrollable * 100` convierte la posición actual del scroll en un porcentaje de 0 a 100, que se usa directamente como el `width` (en porcentaje) de la barra interior.
- `onScroll()` se llama una vez de inmediato al montar el componente (no solo al escuchar el evento), para que la barra empiece con el valor correcto si la página ya estaba desplazada al cargar (por ejemplo, si el usuario llegó con un ancla como `#admisiones`).
- `{ passive: true }` en el listener de scroll le dice al navegador que este código nunca va a cancelar el scroll (`preventDefault`), lo que le permite optimizar el desplazamiento y evitar que se sienta "trabado", algo importante porque el evento de scroll se dispara con mucha frecuencia.
- También escucha `resize`: si la ventana cambia de tamaño (o el contenido cambia de alto por responsive), el porcentaje recalculado sigue siendo correcto.

## Conexión con el resto del sistema
- Se monta una sola vez desde `frontend/app/layout.tsx`, fuera de cualquier página específica, así que corre en todo el sitio.
- No llama a ningún endpoint ni depende de otros componentes.

## Cosas que no son obvias a primera vista
- `aria-hidden="true"` en el contenedor indica que este elemento es puramente decorativo y no debe anunciarse a lectores de pantalla (no transmite información que no esté ya disponible de otra forma, como la barra de scroll nativa del navegador).
- Al estar en el layout raíz y no en una página individual, su estado (`progress`) se reinicia cada vez que se navega a otra ruta de Next.js, lo cual es el comportamiento esperado: cada página nueva empieza su propio scroll desde cero.
