# `frontend/components/ui/count-up.tsx`

**En una frase:** anima un número (como "+5,000" o "62%") contando desde 0 hasta su valor real, pero solo la primera vez que se vuelve visible en pantalla.

## Por qué existe
Es un efecto visual de la landing (estadísticas del hero, porcentajes de progreso) y del panel `/mi-iinicia` (créditos, porcentaje de avance). Contar hacia arriba en vez de simplemente mostrar el número le da más impacto a cifras como "+5,000 egresados", pero sin desperdiciar la animación si el usuario nunca llega a ver esa sección (por ejemplo, si no hace scroll hasta ahí).

## Recorrido del código

### Parsear el texto para separar número, prefijo y sufijo
```tsx
const match = value.match(/^(\D*)([\d,]+)(.*)$/);
if (!match) return;
const [, prefix, numPart, suffix] = match;
const target = Number(numPart.replace(/,/g, ""));
```
El componente recibe un texto ya formateado como `"+5,000"` o `"62%"`, no un número puro. La expresión regular separa tres partes: cualquier texto antes del número (`\D*`, como el `+`), el número con posibles comas (`[\d,]+`), y cualquier texto después (`.*`, como el `%`). `target` es ese número ya limpio de comas, convertido a `Number` para poder animarlo matemáticamente. Si el texto no tiene ningún número reconocible, el `match` es `null` y la función simplemente no hace nada (se muestra el texto tal cual, sin animar).

### Por qué la animación empieza solo cuando es visible
```tsx
const observer = new IntersectionObserver(
  ([entry]) => {
    if (!entry.isIntersecting) return;
    observer.disconnect();
    const duration = 2200;
    const start = performance.now();
    function tick(now: number) {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 2);
      setDisplay(`${prefix}${Math.round(target * eased).toLocaleString("es-MX")}${suffix}`);
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  },
  { threshold: 0.4 },
);
observer.observe(el);
```
`IntersectionObserver` avisa cuando el elemento entra en el área visible del navegador (aquí, cuando al menos el 40% de él es visible, `threshold: 0.4`). Si se animara el número desde que el componente se monta (sin esperar a que sea visible), el usuario que todavía no hizo scroll hasta esa sección se perdería la animación por completo: ya habría terminado antes de que la viera.

`observer.disconnect()` se llama apenas se dispara una vez: la animación de conteo solo debe ocurrir la primera vez que el elemento aparece, no cada vez que el usuario sube y baja la página y vuelve a pasar por ahí.

### La curva de animación ("ease out")
```tsx
const eased = 1 - Math.pow(1 - progress, 2);
```
En vez de que el número avance a velocidad constante (lineal), esta fórmula hace que avance rápido al principio y se desacelere hacia el final (una curva cuadrática de "salida"). Es una sensación más natural que un conteo mecánico uniforme.

### Accesibilidad: respeta "menos movimiento"
```tsx
if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
```
Si el sistema operativo del visitante está configurado para reducir animaciones (por mareo, epilepsia fotosensible u otras razones), el efecto nunca se activa y el componente simplemente muestra el valor final (`display` nunca cambia de su valor inicial, que es el mismo `value` recibido).

## Conexión con el resto del sistema
- Se usa en `app/page.tsx` (estadísticas del hero, "cupos disponibles", avance de ejemplo del campus) y en `app/mi-iinicia/page.tsx` (créditos obtenidos, porcentaje curricular, progreso de cursos, estadísticas del resumen administrativo).
- No llama a ningún endpoint; solo recibe un `value: string` ya formateado por quien lo usa.

## Cosas que no son obvias a primera vista
- El componente no recibe un número, recibe el texto final ya formateado (con el `+`, las comas o el `%` incluidos) y lo "desarma" con una expresión regular; esto permite reutilizar el mismo componente para formatos muy distintos sin tener que pasarle props separadas para prefijo/sufijo/formato.
- Si el texto no tiene ningún dígito reconocible por la expresión regular, el componente no falla: simplemente no anima nada y muestra el texto tal cual llegó.
