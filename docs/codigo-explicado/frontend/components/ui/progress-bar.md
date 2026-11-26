# `frontend/components/ui/progress-bar.tsx`

**En una frase:** una barra de progreso horizontal que crece desde 0 hasta su valor real únicamente cuando entra en el área visible de la pantalla.

## Por qué existe
Se usa para mostrar porcentajes concretos (progreso de un curso, cupos de admisión disponibles) de forma visual. Igual que `CountUp`, anima la primera vez que se ve para dar una sensación de "algo está cargando/calculándose" en vez de simplemente aparecer ya llena, lo que la hace sentir más viva sin ser exagerada.

## Recorrido del código

```tsx
export function ProgressBar({ value, className }: { value: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setWidth(value);
        observer.disconnect();
      },
      { threshold: 0.3 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [value]);

  return (
    <div ref={ref} className={["h-2 w-full overflow-hidden rounded-full bg-surface-neutral", className].filter(Boolean).join(" ")}>
      <div
        className="progress-fill h-full rounded-full bg-secondary transition-[width] duration-1000 ease-out"
        style={{ width: `${width}%`, "--pb-target": `${value}%` } as CSSProperties}
      />
    </div>
  );
}
```
- El componente arranca con `width = 0` (la barra interior vacía) y solo cuando `IntersectionObserver` detecta que al menos el 30% del contenedor es visible, actualiza `width` al valor real (`value`). Como la clase `transition-[width] duration-1000` ya está puesta desde el inicio, ese cambio de `0%` a `value%` se anima suavemente durante 1 segundo en vez de saltar de golpe.
- `observer.disconnect()` tras activarse una vez evita que la barra se vuelva a animar desde 0 cada vez que el usuario la vuelve a ver al hacer scroll arriba y abajo.
- El efecto depende de `[value]`: si el valor real cambiara mientras el componente ya está montado (por ejemplo, si se refresca el progreso de un curso), el efecto se vuelve a ejecutar y, si el elemento sigue en pantalla, puede volver a animar hacia el nuevo valor.
- `--pb-target` es una variable CSS personalizada que se escribe en el `style` en línea junto con el `width` real. No se usa directamente en este archivo: existe para que `globals.css` pueda leerla bajo la media query `prefers-reduced-motion` y fijar el ancho final de inmediato (sin animación) usando esa variable, en vez de depender del `useState` que sí anima.

## Conexión con el resto del sistema
- Se usa en `app/page.tsx` (vista de ejemplo de progreso de cursos, cupos de admisión) y en `app/mi-iinicia/page.tsx` (progreso curricular del estudiante, progreso de cada curso real de Moodle).
- No llama a ningún endpoint; recibe `value` ya calculado por quien lo usa.

## Cosas que no son obvias a primera vista
- El valor real (`value`) siempre se recibe de inmediato como prop; lo que se anima es únicamente la representación visual (`width` en estado interno), nunca el dato en sí. Si algo necesita saber el progreso real sin esperar a la animación, debe usar `value`, no leer el ancho de la barra.
- El comentario del archivo aclara que, con `prefers-reduced-motion`, no hace falta ninguna rama condicional en este componente de React: `globals.css` se encarga de forzar el ancho final usando `--pb-target`, el mismo patrón que usa `Reveal` para esa misma preferencia de accesibilidad.
