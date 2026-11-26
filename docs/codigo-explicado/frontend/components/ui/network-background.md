# `frontend/components/ui/network-background.tsx`

**En una frase:** dibuja, con `<canvas>`, un fondo animado de puntos que se mueven y se conectan entre sí cuando están cerca, usado detrás del hero de la home para evocar una "red" tecnológica/académica.

## Por qué existe
Es un efecto puramente decorativo pensado para reforzar la identidad visual de IINICIA como institución tecnológica en la sección más visible del portal (el hero de la home). Se implementa con `<canvas>` (dibujo de bajo nivel) en vez de cientos de elementos HTML animados, porque mover 42 puntos y evaluar sus distancias cuadro por cuadro sería mucho más costoso con el DOM que con un lienzo de dibujo directo.

## Recorrido del código

### Modelo de datos: un punto con posición y velocidad
```ts
type Dot = { x: number; y: number; vx: number; vy: number };
```
Cada punto tiene una posición (`x`, `y`) y una velocidad (`vx`, `vy`, cuánto se mueve por cuadro en cada eje). No se guarda nada más porque no hace falta: toda la animación es simplemente "sumar la velocidad a la posición en cada cuadro".

### Inicialización
```ts
function init() {
  dots = Array.from({ length: COUNT }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    vx: (Math.random() - 0.5) * 0.25,
    vy: (Math.random() - 0.5) * 0.25,
  }));
}
```
`COUNT = 42` puntos nacen en posiciones aleatorias dentro del contenedor, con una velocidad aleatoria pequeña (entre -0.125 y 0.125 píxeles por cuadro en cada eje, gracias al `- 0.5` que centra el rango en cero). Son valores deliberadamente lentos para que el efecto sea sutil, no una animación llamativa que distraiga del contenido del hero.

### El bucle de animación
```ts
function tick() {
  ctx!.clearRect(0, 0, width, height);

  for (const dot of dots) {
    dot.x += dot.vx;
    dot.y += dot.vy;
    if (dot.x < 0 || dot.x > width) dot.vx *= -1;
    if (dot.y < 0 || dot.y > height) dot.vy *= -1;
  }

  for (let i = 0; i < dots.length; i++) {
    for (let j = i + 1; j < dots.length; j++) {
      const a = dots[i];
      const b = dots[j];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      if (dist < LINK_DISTANCE) {
        ctx!.strokeStyle = `rgba(11, 42, 91, ${0.14 * (1 - dist / LINK_DISTANCE)})`;
        ...
        ctx!.stroke();
      }
    }
  }

  for (const dot of dots) {
    ctx!.fillStyle = "rgba(30, 90, 168, 0.4)";
    ctx!.beginPath();
    ctx!.arc(dot.x, dot.y, 2, 0, Math.PI * 2);
    ctx!.fill();
  }

  frame = requestAnimationFrame(tick);
}
```
En cada cuadro: (1) se borra todo el lienzo, (2) se mueve cada punto y, si llegó al borde, se invierte su velocidad en ese eje (`vx *= -1` o `vy *= -1`) para que "rebote" en vez de salir del área, (3) se comparan todos los pares de puntos entre sí (`i` contra `j > i`, para no comparar un par dos veces) y si están a menos de `LINK_DISTANCE` (140px) se dibuja una línea entre ellos, cuya opacidad disminuye conforme la distancia se acerca al límite (`1 - dist / LINK_DISTANCE`), y (4) se dibuja cada punto como un círculo pequeño. `requestAnimationFrame(tick)` vuelve a llamar a esta misma función en el próximo cuadro que el navegador vaya a pintar, formando el bucle.

Comparar cada punto contra todos los demás es una operación que crece rápido (42 puntos → ~861 pares por cuadro), pero con solo 42 puntos sigue siendo trivial para cualquier navegador moderno; no se optimiza más porque no hace falta.

### Reaccionar a cambios de tamaño de la ventana
```ts
function resize() {
  width = container!.clientWidth;
  height = container!.clientHeight;
  canvas!.width = width;
  canvas!.height = height;
}
...
window.addEventListener("resize", resize);
```
El `<canvas>` necesita que su `width`/`height` reales (atributos del elemento, no solo CSS) coincidan con el tamaño visible del contenedor; si no se actualizan al redimensionar la ventana, el dibujo se vería recortado o estirado.

### Apagado limpio y respeto a "menos movimiento"
```ts
if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
...
return () => {
  cancelAnimationFrame(frame);
  window.removeEventListener("resize", resize);
};
```
Si el visitante pidió menos movimiento, el efecto completo se omite (ni siquiera se crean los puntos ni se dibuja nada): es una decisión de accesibilidad, no solo de rendimiento. Al desmontarse el componente, se cancela el cuadro de animación pendiente y se quita el listener de `resize`, para no dejar un bucle corriendo en el fondo sin que nadie lo vea.

## Conexión con el resto del sistema
- Se usa una sola vez, en `app/page.tsx`, como fondo del hero de la home.
- No llama a ningún endpoint ni depende de ningún otro componente.

## Cosas que no son obvias a primera vista
- Los colores (`rgba(11, 42, 91, ...)` para las líneas, `rgba(30, 90, 168, ...)` para los puntos) están escritos a mano con los mismos valores que las variables `--color-primary`/`--color-secondary` de `globals.css`, en vez de leerlos dinámicamente. El propio código lo marca como una limitación conocida: `shortcut: los colores están fijos a los mismos valores de --color-primary/--color-secondary en globals.css; si esos tokens cambian, actualizar aquí también.`
- El `<canvas>` tiene `aria-hidden="true"`: es puramente decorativo y no debe anunciarse a lectores de pantalla.
