# `frontend/app/registro/page.tsx`

**En una frase:** formulario de alta de un aspirante nuevo (nombre, correo, contraseña, programa de interés) que crea la cuenta y abre sesión automáticamente.

## Por qué existe
Es la puerta de entrada para gente que todavía no es parte de IINICIA: alguien interesado en estudiar llena este formulario y queda registrado con el rol `aspirante`. A diferencia del login, aquí no hay 2FA: es la primera vez que esa persona existe en el sistema, así que basta con validar los datos y crear la cuenta.

## Recorrido del código

### Estado del formulario como un solo objeto
```tsx
type FormState = {
  nombreCompleto: string;
  correo: string;
  password: string;
  confirmarPassword: string;
  programaInteresId: string;
  aceptaAvisoPrivacidad: boolean;
  deseaInformacionBecas: boolean;
};

const INITIAL_STATE: FormState = { ... };

const [form, setForm] = useState<FormState>(INITIAL_STATE);
```
En vez de un `useState` por campo, todos los campos viven en un solo objeto `form`. Cada `<Input>` actualiza su parte con `setForm({ ...form, campo: valor })`. Es más código por campo, pero hace trivial mandar `form` completo a `registrarAspirante(form)` al final.

### Catálogo de programas en vivo
```tsx
useEffect(() => {
  let cancelado = false;
  obtenerProgramas()
    .then((data) => { if (!cancelado) setProgramas(data); })
    .catch(() => {
      // Si el backend responde con un error real (no "no disponible"), el selector
      // simplemente queda vacío: el usuario no puede enviar el formulario sin elegir uno.
    });
  return () => { cancelado = true; };
}, []);
```
A diferencia de la home (`app/page.tsx`), aquí **no** hay datos de ejemplo de respaldo si `obtenerProgramas()` falla: el selector de "Programa de interés" se queda vacío. Es intencional: inscribir a alguien en un programa que no existe realmente (un dato simulado) sería peor que mostrar un selector vacío y que la validación bloquee el envío.

### Validación antes de llamar al backend
```tsx
function validate(): boolean {
  const nextErrors: Partial<Record<keyof FormState, string>> = {};
  if (!form.nombreCompleto.trim()) nextErrors.nombreCompleto = "Ingresa tu nombre completo.";
  if (!/^\S+@\S+\.\S+$/.test(form.correo)) nextErrors.correo = "Ingresa un correo electrónico válido.";
  if (form.password.length < 8) nextErrors.password = "La contraseña debe tener al menos 8 caracteres.";
  if (form.confirmarPassword !== form.password) nextErrors.confirmarPassword = "Las contraseñas no coinciden.";
  if (!form.programaInteresId) nextErrors.programaInteresId = "Selecciona un programa de interés.";
  if (!form.aceptaAvisoPrivacidad) nextErrors.aceptaAvisoPrivacidad = "Debes aceptar el Aviso de Privacidad.";
  setErrors(nextErrors);
  return Object.keys(nextErrors).length === 0;
}
```
Revisa los requisitos mínimos (correo con forma de correo, contraseña de al menos 8 caracteres, que ambas contraseñas coincidan, que haya programa elegido y que se haya aceptado el aviso de privacidad) **antes** de gastar una llamada de red. El backend vuelve a validar todo esto por su cuenta: esta validación es solo para dar retroalimentación instantánea, nunca es la autoridad final.

### Registro y sesión automática
```tsx
async function handleSubmit(event: FormEvent<HTMLFormElement>) {
  event.preventDefault();
  setSubmitError(null);
  if (!validate()) return;
  setSubmitting(true);
  try {
    await registrarAspirante(form);
    setSuccess(true);
  } catch (error) {
    setSubmitError(error instanceof ApiError ? error.message : "No se pudo completar el registro. Intenta de nuevo más tarde.");
  } finally {
    setSubmitting(false);
  }
}
```
`registrarAspirante` (de `useAuth()`) manda los datos a `POST /auth/registro` y, si todo va bien, guarda la sesión de una vez (token + usuario), sin pasar por el flujo de 2FA del login: es la única puerta de entrada donde no hace falta el segundo factor, porque la cuenta se acaba de crear en ese mismo momento con ese mismo correo y contraseña.

### Pantalla de éxito
```tsx
if (success) {
  return ( ... <Button variant="primary" onClick={() => router.push("/mi-iinicia")}>Ir a Mi IINICIA</Button> ... );
}
```
Cuando el registro tuvo éxito, el componente reemplaza por completo el formulario con una tarjeta de confirmación. Es un `return` anticipado dentro del mismo componente: más simple que crear una ruta `/registro/exito` separada para algo que solo necesita mostrarse una vez en la misma sesión.

## Conexión con el resto del sistema
- Llama a `GET /programas` (`obtenerProgramas`) para llenar el selector de programas.
- Llama a `POST /auth/registro` a través de `registrarAspirante()` de `useAuth()` (`frontend/lib/auth-context.tsx` → `frontend/lib/api.ts`).
- Usa `Card`, `Input`, `Select`, `Button`, `Reveal` de `frontend/components/ui/`.
- Tras el éxito, navega a `/mi-iinicia`. Enlaza a `/login` para quien ya tiene cuenta.

## Cosas que no son obvias a primera vista
- No hay 2FA en el registro: la cuenta recién creada abre sesión directo. El 2FA solo aplica a logins posteriores (ver `frontend/app/login/page.tsx`).
- El checkbox de "Aviso de Privacidad" es obligatorio (bloquea el envío); el de "Deseo recibir información sobre becas" es opcional y viene marcado por defecto.
- El selector de programas no tiene datos de respaldo simulados: si el backend no responde, el formulario queda sin poder enviarse en vez de inscribir a alguien en un programa inventado.
