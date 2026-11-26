# `frontend/components/ui/reveal.tsx`

**En una frase:** envuelve cualquier contenido y lo hace aparecer con una animación suave (fade o zoom) la primera vez que entra en el área visible de la pantalla al hacer scroll.

## Por qué existe
Es el componente de animación más usado de todo el portal (aparece decenas de veces en `app/page.tsx` y en todas las páginas con tarjetas). En vez de que cada sección implemente su propia detección de "¿ya es visible?", este componente la centraliza una sola vez.

## Recorrido del código

```tsx
export function Reveal({ children, className, delay = 0, variant = "fade", style, ...rest }: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // prefers-reduced-motion: globals.css fuerza opacity/transform fijos en
    // .reveal sin importar este estado, así que no hace falta ramificar aquí.
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={[
        "reveal transition-all duration-[1300ms] ease-[cubic-bezier(0.16,1,0.3,1)]",
        variant === "zoom"
          ? visible ? "opacity-100 scale-100" : "opacity-0 scale-110"
          : visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3",
        className,
      ].filter(Boolean).join(" ")}
      style={delay ? { ...style, transitionDelay: `${delay}ms` } : style}
      {...rest}
    >
      {children}
    </div>
  );
}
```
- `IntersectionObserver` con `threshold: 0.15` dispara cuando al menos el 15% del elemento es visible; `rootMargin: "0px 0px -40px 0px"` reduce el área de detección 40px desde abajo, para que la animación empiece un poco antes de que el elemento llegue al borde inferior exacto de la pantalla (se siente más natural que esperar a que esté completamente encuadrado).
- `observer.disconnect()` al volverse visible asegura que la animación de entrada ocurra **una sola vez**: si el usuario hace scroll hacia arriba y vuelve a bajar, el contenido ya se queda visible, no vuelve a desaparecer y reaparecer.
- `variant="fade"` (la opción por defecto) combina opacidad con un pequeño desplazamiento vertical (`translate-y-3` → `translate-y-0`); `variant="zoom"` combina opacidad con escala (`scale-110` → `scale-100`, achicándose levemente hasta su tamaño real). La home usa `zoom` específicamente para imágenes destacadas, donde un ligero acercamiento inicial se ve mejor que un desplazamiento.
- `delay` permite escalonar varias instancias de `Reveal` dentro de la misma cuadrícula (por ejemplo, las tarjetas de "Modelo educativo" en la home usan `delay={i * 120}` para que cada tarjeta aparezca un poco después que la anterior). Se aplica como `transitionDelay` en el `style` en línea, no como clase de Tailwind, porque el valor es dinámico (depende del índice `i` de cada elemento en su lista).

## Conexión con el resto del sistema
- Es el componente de animación de scroll más reutilizado: aparece en `app/page.tsx`, `app/login/page.tsx`, `app/registro/page.tsx`, `app/recuperar/page.tsx`, `app/restablecer/page.tsx`, `app/mi-iinicia/page.tsx`, `app/admin/materias/page.tsx`, `app/admin/programas/page.tsx`, `app/admin/usuarios/page.tsx`.
- No llama a ningún endpoint; es puramente de interfaz.

## Cosas que no son obvias a primera vista
- El comentario en el código aclara que `prefers-reduced-motion` **no** se maneja aquí en JavaScript: la clase CSS `.reveal` en `globals.css` ya fuerza `opacity`/`transform` a sus valores finales bajo esa preferencia del sistema, así que el componente no necesita ninguna rama condicional adicional para eso; delegar esa responsabilidad al CSS evita duplicar la lógica de accesibilidad en dos lugares.
- Aunque el nombre sugiere "revelar algo oculto", el contenido siempre está presente en el DOM (y es leíble por lectores de pantalla y buscadores) desde el primer render; solo su apariencia visual (opacidad/transformación) cambia con el scroll.
