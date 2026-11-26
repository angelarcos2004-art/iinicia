# `frontend/app/restablecer/page.tsx`

**En una frase:** pantalla donde el usuario, tras hacer clic en el enlace del correo de recuperación, define su nueva contraseña.

## Por qué existe
Es el segundo paso del flujo de "olvidé mi contraseña" que empieza en `/recuperar`. El enlace que llega al correo apunta aquí con dos datos en la URL: el correo y un token de un solo uso que el backend generó. Esta página los lee, pide la nueva contraseña (dos veces, para confirmarla) y se la manda al backend junto con el token.

## Recorrido del código

### Por qué está envuelta en `Suspense`
```tsx
function RestablecerForm() {
  const searchParams = useSearchParams();
  ...
}

export default function RestablecerPage() {
  return (
    <section ...>
      <Reveal variant="zoom">
        <Suspense fallback={null}>
          <RestablecerForm />
        </Suspense>
      </Reveal>
    </section>
  );
}
```
`useSearchParams()` (para leer `?correo=...&token=...` de la URL) obliga, en Next.js App Router, a que el componente que lo usa esté dentro de un límite `<Suspense>`; de lo contrario, Next.js falla al generar la página. Por eso la lógica real vive en un componente separado (`RestablecerForm`) envuelto en `<Suspense fallback={null}>` dentro del componente de página. `fallback={null}` está bien aquí porque la lectura de los parámetros de la URL es instantánea (no hay una espera real que mostrar).

### Enlace incompleto o manipulado
```tsx
const correo = searchParams.get("correo") ?? "";
const token = searchParams.get("token") ?? "";

if (!correo || !token) {
  return (
    <Card className="flex flex-col gap-4">
      <h1 ...>Enlace inválido</h1>
      ...
      <Link href="/recuperar">Pedir un enlace nuevo</Link>
    </Card>
  );
}
```
Si a alguien le falta `correo` o `token` en la URL (enlace copiado a medias, manipulado a mano, etc.), la página no intenta adivinar ni mostrar un formulario roto: corta ahí mismo con un mensaje claro y un enlace para pedir un enlace nuevo.

### Validación y envío
```tsx
function validate(): boolean {
  const nextErrors: { nuevaPassword?: string; confirmacion?: string } = {};
  if (nuevaPassword.length < 8) nextErrors.nuevaPassword = "La contraseña debe tener al menos 8 caracteres.";
  if (confirmacion !== nuevaPassword) nextErrors.confirmacion = "Las contraseñas no coinciden.";
  setErrors(nextErrors);
  return Object.keys(nextErrors).length === 0;
}

async function handleSubmit(event: FormEvent<HTMLFormElement>) {
  event.preventDefault();
  setSubmitError(null);
  if (!validate()) return;
  setSubmitting(true);
  try {
    await restablecerPassword({ correo, token, nuevaPassword });
    router.push("/login");
  } catch (err) {
    setSubmitError(err instanceof ApiError ? err.message : "No se pudo restablecer tu contraseña. Intenta más tarde.");
  } finally {
    setSubmitting(false);
  }
}
```
Mismas reglas mínimas que en el registro (8 caracteres, ambas contraseñas iguales). El backend es quien realmente valida que el `token` sea válido y no haya expirado o ya se haya usado; si eso falla, el `catch` muestra el mensaje de error del backend (`ApiError`). Si todo sale bien, se manda al usuario a `/login` para que inicie sesión con su nueva contraseña (no se abre sesión automáticamente aquí).

## Conexión con el resto del sistema
- Lee `correo` y `token` de la URL, generados por el backend cuando se llamó a `POST /auth/recuperar` desde `/recuperar`.
- Llama a `POST /auth/restablecer` a través de `restablecerPassword()` (`frontend/lib/api.ts`).
- Usa `Input`, `Button`, `Card`, `Reveal` de `frontend/components/ui/`.
- Tras el éxito, redirige a `/login`.

## Cosas que no son obvias a primera vista
- El componente real (`RestablecerForm`) está separado del componente de página exportado por defecto únicamente por la restricción técnica de `useSearchParams()` + `Suspense`; no hay otra razón de diseño detrás de esa división.
- El `token` de esta URL es del propio backend de IINICIA (para recuperación de contraseña), no tiene relación con ningún token de Moodle.
