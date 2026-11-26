# `frontend/components/ui/select.tsx`

**En una frase:** el menú desplegable (`<select>`) estándar del portal, con la misma etiqueta, mensaje de error/orientación y estilo visual que `Input`, para que ambos se vean consistentes en un mismo formulario.

## Por qué existe
Varios formularios necesitan que el usuario elija una opción de una lista fija (programa de interés, tipo de programa, modalidad, rol a asignar, curso de Moodle). En vez de que cada página escriba su propio `<select>` con clases de Tailwind repetidas, este componente centraliza esa apariencia y su comportamiento de accesibilidad, igual que `Input` lo hace para los campos de texto.

## Recorrido del código

```tsx
export function Select({ label, id, error, hint, children, className, ...rest }: SelectProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-label-md font-display font-semibold text-ink">
        {label}
      </label>
      <select
        id={id}
        className={[
          "h-12 rounded-md border bg-surface-canvas px-4 text-body-md text-ink outline-none transition-colors",
          error
            ? "border-error focus:border-error focus:ring-[3px] focus:ring-error/15"
            : "border-border-subtle focus:border-secondary focus:ring-[3px] focus:ring-secondary/15",
          className,
        ].filter(Boolean).join(" ")}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        {...rest}
      >
        {children}
      </select>
      {error ? (
        <p id={`${id}-error`} className="text-body-sm text-error">{error}</p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-body-sm text-ink-muted">{hint}</p>
      ) : null}
    </div>
  );
}
```
No tiene estado propio ni efectos: es un componente puramente de presentación, pero con la misma lógica de accesibilidad que `Input` (ver `frontend/components/ui/input.tsx`): el borde cambia a rojo si hay `error`, y `aria-describedby` conecta el `<select>` con el párrafo de error o de ayuda (`hint`) según cuál de los dos esté presente, usando el mismo esquema de ids (`${id}-error` / `${id}-hint`).

`children` recibe las opciones (`<option>`) directamente desde quien usa el componente, en vez de que `Select` reciba una lista de valores/etiquetas como prop. Esto le da a cada página control total sobre cómo construye sus opciones (algunas vienen de un arreglo fijo como `TIPO_LABEL`, otras de datos cargados del backend como la lista de programas).

## Conexión con el resto del sistema
- Se usa en: `app/page.tsx` (programa de interés en el formulario de contacto), `app/registro/page.tsx` (programa de interés), `app/admin/materias/page.tsx` (filtro de carrera), `app/admin/programas/page.tsx` (tipo y modalidad del nuevo programa), `app/admin/usuarios/page.tsx` (programa del ámbito de un coordinador, curso de Moodle al matricular).
- No llama a ningún endpoint; las opciones que muestra ya vienen resueltas por la página que lo usa (algunas de ellas, como el catálogo de programas o de cursos de Moodle, sí vienen de `frontend/lib/api.ts`, pero esa llamada ocurre en la página, no en este componente).

## Cosas que no son obvias a primera vista
- A diferencia de `Input`, este componente no necesita `"use client"` ni ningún hook de React: no tiene estado propio. Aun así se documenta por separado porque el proyecto pidió explícitamente cubrirlo, y porque comparte un patrón de accesibilidad (error/hint/aria) que vale la pena dejar explícito.
- Que una opción esté deshabilitada (como el placeholder `<option value="" disabled>Selecciona una opción</option>` en el formulario de contacto de la home) es responsabilidad de quien pasa los `children`, no de este componente.
