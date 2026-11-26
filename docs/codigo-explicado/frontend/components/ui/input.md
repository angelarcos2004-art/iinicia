# `frontend/components/ui/input.tsx`

**En una frase:** el campo de texto estándar del portal, con etiqueta, mensaje de error u orientación, y un botón para mostrar/ocultar la contraseña cuando el campo es de ese tipo.

## Por qué existe
Todos los formularios del portal (login, registro, recuperar, restablecer, contacto, paneles admin) usan el mismo campo de texto para que se vean y se comporten igual. Centralizarlo en un componente evita repetir, en cada formulario, las clases de Tailwind para el estado normal/error/foco y la lógica de mostrar/ocultar contraseña.

## Recorrido del código

```tsx
export function Input({ label, id, error, hint, className, type, ...rest }: InputProps) {
  const [mostrarPassword, setMostrarPassword] = useState(false);
  const esPassword = type === "password";

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-label-md font-display font-semibold text-ink">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={esPassword && mostrarPassword ? "text" : type}
          ...
        />
        {esPassword && (
          <button
            type="button"
            onClick={() => setMostrarPassword((v) => !v)}
            aria-label={mostrarPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
            className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-ink-muted hover:text-ink"
          >
            <Icon name={mostrarPassword ? "visibility_off" : "visibility"} />
          </button>
        )}
      </div>
      ...
    </div>
  );
}
```
`esPassword` se calcula comparando la prop `type` recibida contra `"password"`. Si el campo es de contraseña, se agrega un botón superpuesto (`absolute`, posicionado dentro del mismo contenedor `relative` que el input) que alterna `mostrarPassword`. Cuando está activo, el `type` real que se le pasa al `<input>` cambia a `"text"` (revela el contenido); cuando no, usa el `type` original (`"password"`, que el navegador oculta con puntos).

`type="button"` en el botón es importante: sin eso, dentro de un `<form>`, un `<button>` sin `type` explícito se comporta como `type="submit"` por defecto y enviaría el formulario entero al hacer clic en el ícono del ojo.

`aria-label` cambia según el estado (`"Ocultar contraseña"` / `"Mostrar contraseña"`) para que un lector de pantalla anuncie la acción correcta, ya que el botón solo muestra un ícono, sin texto visible.

```tsx
className={[
  "...",
  esPassword ? "pr-11" : "",
  error ? "border-error focus:border-error ..." : "border-border-subtle focus:border-secondary ...",
  className,
].filter(Boolean).join(" ")}
```
Cuando el campo es de contraseña, se le agrega `pr-11` (relleno a la derecha) para que el texto no quede escondido debajo del botón del ojo. El color del borde cambia completamente si hay un `error`, independientemente de si el usuario está interactuando con el campo o no.

```tsx
aria-invalid={Boolean(error)}
aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
```
Estos atributos conectan el campo con su mensaje de error o de ayuda para quienes usan lector de pantalla: `aria-invalid` anuncia que el valor no es válido, y `aria-describedby` apunta al `id` del párrafo que contiene el mensaje correspondiente (que se genera más abajo con ese mismo `id` más el sufijo `-error` o `-hint`).

## Conexión con el resto del sistema
- Se usa en prácticamente todos los formularios: `app/login/page.tsx`, `app/registro/page.tsx`, `app/recuperar/page.tsx`, `app/restablecer/page.tsx`, `app/page.tsx` (contacto), `app/mi-iinicia/page.tsx` (notificaciones, documentos), `app/admin/materias/page.tsx`, `app/admin/usuarios/page.tsx`.
- Usa `Icon` (`frontend/components/ui/icon.tsx`) para el ícono del ojo abierto/cerrado.
- No llama a ningún endpoint del backend; es puramente de interfaz.

## Cosas que no son obvias a primera vista
- El estado `mostrarPassword` es local a cada instancia de `Input`: si una página tiene dos campos de contraseña (como "Nueva contraseña" y "Confirmar contraseña" en `/restablecer`), cada uno tiene su propio botón de mostrar/ocultar independiente.
- El botón de mostrar/ocultar contraseña no cambia el valor del campo, solo cómo el navegador lo muestra (`type="text"` vs `type="password"`); el texto que el usuario escribió nunca se pierde ni se transforma al alternar.
