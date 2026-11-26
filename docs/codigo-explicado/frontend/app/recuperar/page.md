# `frontend/app/recuperar/page.tsx`

**En una frase:** formulario de "¿olvidaste tu contraseña?" que pide un correo y, sin confirmar si existe o no una cuenta con ese correo, dice que envió un enlace de recuperación.

## Por qué existe
Es el primer paso del flujo de recuperación de contraseña: el usuario escribe su correo aquí y, si ese correo tiene una cuenta, recibe un enlace que lo lleva a `/restablecer` con un token válido para fijar una nueva contraseña.

## Recorrido del código

```tsx
async function handleSubmit(event: FormEvent<HTMLFormElement>) {
  event.preventDefault();
  setSubmitError(null);

  if (!/^\S+@\S+\.\S+$/.test(correo)) {
    setError("Ingresa un correo electrónico válido.");
    return;
  }
  setError(undefined);

  setSubmitting(true);
  try {
    await recuperarPassword(correo);
    // El backend siempre responde igual exista o no la cuenta: este mensaje nunca debe
    // confirmar ni negar si el correo está registrado.
    setEnviado(true);
  } catch (err) {
    setSubmitError(err instanceof ApiError ? err.message : "No se pudo procesar tu solicitud. Intenta más tarde.");
  } finally {
    setSubmitting(false);
  }
}
```
Primero valida que el texto tenga forma de correo (sin esto se gastaría una llamada de red por un campo vacío). Luego llama a `recuperarPassword(correo)`. Pase lo que pase en el backend (el correo existe o no), la respuesta exitosa siempre lleva al mismo mensaje de "si ese correo está registrado, te enviamos un enlace". Esto es una decisión de seguridad deliberada: si la página dijera "ese correo no existe" para correos no registrados, cualquiera podría usar este formulario para averiguar qué correos están dados de alta en IINICIA (un ataque de enumeración de usuarios). El único caso en el que se muestra un mensaje distinto es cuando la llamada falla por un error real del backend (`ApiError`), no por "cuenta no encontrada".

```tsx
{enviado ? (
  <p className="text-body-md text-ink">
    Si ese correo está registrado en IINICIA, te enviamos un enlace de recuperación.
    Revisa tu bandeja de entrada (y spam).
  </p>
) : ( ...formulario... )}
```
El texto "Si ese correo está registrado..." refuerza la misma idea: nunca confirma ni niega la existencia de la cuenta.

## Conexión con el resto del sistema
- Llama a `POST /auth/recuperar` a través de `recuperarPassword()` (`frontend/lib/api.ts`), sin necesitar un token de sesión (todavía no hay sesión en este punto).
- El enlace que el backend manda por correo apunta a `frontend/app/restablecer/page.tsx`, con `correo` y `token` como parámetros de la URL.
- Usa `Input`, `Button`, `Card`, `Reveal` de `frontend/components/ui/`.

## Cosas que no son obvias a primera vista
- El mensaje de éxito es intencionalmente ambiguo sobre si la cuenta existe; esto se valida y se mantiene así tanto en el frontend como en el backend (misma respuesta sin importar el resultado real).
- Esta página no necesita el token ni la sesión del usuario: funciona para cualquier visitante, logueado o no.
