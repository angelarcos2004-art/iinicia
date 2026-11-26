# `frontend/lib/api.ts`

**En una frase:** el único archivo del frontend que habla directamente con el backend de IINICIA por HTTP; todas las páginas pasan por aquí para pedir o mandar datos.

## Por qué existe
Centralizar las llamadas HTTP en un solo lugar evita que cada página tenga que repetir la lógica de "armar la URL, poner el header de autorización, interpretar el error". También es el único lugar donde vive `NEXT_PUBLIC_API_URL` (la dirección del backend) y donde se decide qué hacer cuando el backend no responde en absoluto versus cuando responde con un error.

## Recorrido del código

### Dos tipos de error, a propósito separados
```ts
/** El backend no responde o NEXT_PUBLIC_API_URL no está configurado. */
export class BackendUnavailableError extends Error {}

/** El backend respondió, pero rechazó la solicitud (credenciales, validación, etc.). */
export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}
```
Esta distinción es la base de cómo cada página decide qué mostrarle al usuario. `ApiError` trae un mensaje que **viene del backend** (seguro de mostrar: ya está en español y pensado para el usuario) y un `status` HTTP (crucial para detectar un 401 = sesión vencida, ver `frontend/app/mi-iinicia/page.tsx`). `BackendUnavailableError` significa que ni siquiera hubo respuesta (sin internet, backend caído, o falta configurar `NEXT_PUBLIC_API_URL`): en ese caso, algunas funciones (como `obtenerProgramas`) usan datos de ejemplo como respaldo; otras (cursos reales de un usuario) simplemente no lo hacen, porque inventar datos personales sería peor que un error.

### Los "helpers" de fetch son casi idénticos a propósito
```ts
async function postJSON<T>(path: string, body: unknown): Promise<T> { ... }
async function sendAuthJSON<T>(method: "POST" | "PATCH", path: string, token: string, body: unknown): Promise<T> { ... }
async function getJSON<T>(path: string, token: string): Promise<T> { ... }
async function getPublicJSON<T>(path: string): Promise<T> { ... }
async function postAuthFormData<T>(path: string, token: string, body: FormData): Promise<T> { ... }
```
Cada uno repite el mismo esqueleto: comprobar que `API_URL` existe, intentar el `fetch` (capturando errores de red como `BackendUnavailableError`), y si la respuesta no es `ok`, convertirla en `ApiError` leyendo el mensaje que mandó el backend. Se mantienen separados (en vez de una única función gigante con muchos parámetros opcionales) porque cada variante tiene una firma distinta y previsible: pública vs. con token, con cuerpo JSON vs. sin cuerpo vs. `FormData`. Es más código, pero cada función que la usa es más fácil de leer.

```ts
/** Como sendAuthJSON, pero con multipart/form-data (subida de archivos): nunca fija Content-Type, el navegador pone el boundary. */
async function postAuthFormData<T>(path: string, token: string, body: FormData): Promise<T> {
  ...
  headers: { Authorization: `Bearer ${token}` },
  body,
  ...
}
```
Aquí **no** se pone `Content-Type` a mano: cuando el cuerpo es un `FormData`, el navegador necesita generar ese encabezado él mismo porque incluye un "boundary" (un separador único) que varía en cada petición. Si se fijara manualmente, la subida de archivos (como los documentos de admisión) se rompería.

### El fallback de datos de ejemplo, acotado a un solo caso
```ts
export async function obtenerProgramas(): Promise<Programa[]> {
  try {
    return await getPublicJSON<Programa[]>("/programas");
  } catch (error) {
    if (error instanceof BackendUnavailableError) {
      return withMockDelay(MOCK_PROGRAMAS);
    }
    throw error;
  }
}
```
Importante: el `catch` solo absorbe `BackendUnavailableError` (backend no disponible) y deja pasar cualquier `ApiError` real (el backend sí respondió, pero con un error de verdad, como un 500). Es la diferencia entre "no hay con quién hablar, muestro algo plausible" y "hablé con el backend y dijo que algo está mal, hay que mostrar ese error".

```ts
function withMockDelay<T>(value: T, ms = 450): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}
```
Simula la latencia que tendría una llamada de red real, para que los estados de "cargando..." de la interfaz no se sientan falsos cuando en realidad se está usando el catálogo de respaldo.

### Un comentario de seguridad explícito
```ts
/**
 * Pide el enlace de recuperación de contraseña. El backend siempre responde igual, exista o
 * no la cuenta (nunca hay que revelar qué correos están registrados), así que esta función no
 * necesita (ni debe) distinguir ese caso.
 */
export async function recuperarPassword(correo: string): Promise<void> { ... }
```
Esta función deliberadamente no distingue "correo existe" de "correo no existe": ambos casos producen la misma respuesta del backend, y esta función la pasa tal cual. Prevenir enumeración de usuarios es una decisión de seguridad tomada a propósito, no un descuido.

### Descargar un archivo que requiere autenticación
```ts
export async function abrirDocumento(token: string, id: string): Promise<void> {
  ...
  const response = await fetch(`${API_URL}/documentos/${id}/archivo`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new ApiError("No se pudo abrir el documento.", response.status);
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank");
}
```
Un `<a href="...">` normal no puede llevar el encabezado `Authorization`, así que para ver un documento de admisión hay que pedirlo con `fetch`, recibirlo como `blob` (datos binarios en memoria) y crear una URL temporal del navegador (`URL.createObjectURL`) que sí se puede abrir en una pestaña nueva.

## Conexión con el resto del sistema
Este archivo es la única capa entre todas las páginas/componentes del frontend y el backend NestJS. Endpoints que expone (ruta → quién la usa):
- `POST /auth/login`, `POST /auth/login/verificar`, `POST /auth/registro`, `POST /auth/recuperar`, `POST /auth/restablecer` → login, registro y recuperación de contraseña.
- `GET /programas`, `POST /programas`, `PATCH /programas/:id` → home, registro, `/admin/programas`.
- `GET /materias`, `POST /materias`, `PATCH /materias/:id`, `DELETE /materias/:id` → `/admin/materias`.
- `GET /estudiante/cursos`, `GET /estudiante/moodle-sso`, `GET /estudiante/actividades` → `/mi-iinicia` (datos reales de Moodle).
- `GET /usuarios`, `PATCH /usuarios/:id/rol`, `PATCH /usuarios/:id/programa-coordinado`, `POST /usuarios/:id/matricula`, `GET /usuarios/cursos-moodle`, `GET /usuarios/mis-estudiantes`, `POST /usuarios/:id/notificar` → `/admin/usuarios` y `/mi-iinicia`.
- `GET /aspirante/solicitud`, `GET /aspirante/documentos`, `POST /aspirante/documentos` → `/mi-iinicia` (vista de aspirante).
- `GET /documentos/usuario/:id`, `PATCH /documentos/:id/estado`, `GET /documentos/:id/archivo` → `/admin/usuarios` (revisión de documentos).
- Usa `MOCK_PROGRAMAS` de `frontend/lib/mock-data.ts` como respaldo si el backend no responde a `/programas`.
- Importa y re-exporta tipos de `frontend/lib/types.ts`.
- `frontend/lib/auth-context.tsx` envuelve `login`, `verificarCodigo2FA` y `registrarAspirante` de este archivo.

## Cosas que no son obvias a primera vista
- Ningún token de Moodle pasa nunca por este archivo: `obtenerUrlCampus`/`obtenerUrlCampusActividad` solo piden al backend una URL de autologin ya generada; el backend es quien habla con Moodle y guarda sus propias credenciales en variables de entorno (regla del proyecto).
- `obtenerProgramas` es la única función con datos de respaldo simulados; el resto de las funciones que traen información personal real (cursos, actividades, usuarios, documentos) nunca inventan nada si el backend falla.
- `login()` nunca entrega un token: solo confirma que el backend mandó el código de dos factores. El token real llega con `verificarCodigo2FA`.
