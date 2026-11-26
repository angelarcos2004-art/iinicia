# `frontend/lib/auth-context.tsx`

**En una frase:** guarda quién inició sesión (token + datos del usuario) en memoria y en el navegador, y le da a cualquier componente del portal una forma de leer o cambiar esa sesión con `useAuth()`.

## Por qué existe
Next.js no tiene, de fábrica, un lugar "global" para compartir datos entre componentes sin pasarlos a mano por props en cada nivel. React sí lo tiene: el Context API. `AuthProvider` usa ese patrón para que, por ejemplo, el header (`SiteHeader`) sepa que hay alguien logueado y muestre su nombre, sin que `layout.tsx` tenga que pasarle esa información directamente.

## Recorrido del código

### Dónde vive la sesión y por qué
```ts
const STORAGE_KEY = "iinicia.sesion";
type Sesion = { token: string; usuario: Usuario };
```
```tsx
/**
 * Sesion del usuario para esta primera entrega: vive en localStorage del
 * navegador mientras no exista un backend con JWT/cookies reales
 * (docs/requerimientos.md seccion 10, SSO con Keycloak pendiente). Permite
 * que el header y /mi-iinicia reaccionen a quien inicio sesion y a su rol.
 */
```
El comentario deja explícito que esto es una solución para la primera entrega: guardar el JWT en `localStorage`/`sessionStorage` del navegador es más simple que implementar cookies HttpOnly + un proveedor de identidad completo (Keycloak), pero es una decisión temporal y documentada, no el diseño final planeado para el proyecto.

### "Recordarme": localStorage vs. sessionStorage
```ts
// "Recordarme" desmarcado => sessionStorage (la sesion no sobrevive a cerrar
// la pestaña); marcado (default) => localStorage, como antes.
function guardarSesion(sesion: Sesion | null, recordar = true) {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
    window.sessionStorage.removeItem(STORAGE_KEY);
    if (sesion) {
      (recordar ? window.localStorage : window.sessionStorage).setItem(STORAGE_KEY, JSON.stringify(sesion));
    }
  } catch {
    // localStorage/sessionStorage no disponible (modo privado, etc.): la
    // sesion solo vive en memoria durante esta pestaña.
  }
}
```
`localStorage` persiste aunque se cierre el navegador por completo; `sessionStorage` se borra en cuanto se cierra la pestaña. El checkbox "Recordarme" del login decide cuál de los dos se usa. Siempre se limpian **ambos** primero (`removeItem` en los dos) para no dejar una copia vieja de la sesión en el almacenamiento que no se está usando esta vez; si no se hiciera así, cerrar sesión con "recordarme" desmarcado podría dejar una sesión fantasma en `localStorage` de un login anterior.

El `try/catch` cubre el caso de navegación privada o configuraciones que bloquean el almacenamiento del navegador: en ese caso, la sesión simplemente no sobrevive a un refresh, pero la app no se rompe.

```ts
function leerSesionGuardada(): Sesion | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY) ?? window.sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Sesion) : null;
  } catch {
    return null;
  }
}
```
Al leer, se revisa primero `localStorage` y, si no hay nada ahí, `sessionStorage`: cualquiera de los dos lugares donde pudo haberse guardado la sesión la última vez.

### Por qué la lectura inicial usa un efecto y no se lee directo en el render
```tsx
const [sesion, setSesion] = useState<Sesion | null>(null);
const [cargando, setCargando] = useState(true);

useEffect(() => {
  // Lectura unica de localStorage al montar: es hidratacion segura de
  // una fuente externa (no hay forma de leerla durante el render en
  // servidor), no un ciclo de renders en cascada.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  setSesion(leerSesionGuardada());
  setCargando(false);
}, []);
```
`localStorage` no existe durante el renderizado en el servidor (Next.js también ejecuta componentes en el servidor antes de enviarlos al navegador), así que leerlo directamente en el cuerpo del componente rompería ese renderizado. Por eso se lee dentro de un `useEffect`, que solo corre en el navegador, después del primer render. Mientras eso no ha pasado, `cargando` es `true`: cualquier página que dependa de saber si hay sesión (como `/mi-iinicia`) espera a que `cargando` sea `false` antes de decidir redirigir o no.

### El flujo de dos pasos, reflejado en dos funciones separadas
```ts
async function login(input: LoginInput): Promise<Requiere2FAResponse> {
  return apiLogin(input);
}

async function verificarCodigo2FA(correo: string, codigo: string, recordar = true) {
  aplicarRespuesta(await apiVerificarCodigo2FA(correo, codigo), recordar);
}
```
`login` no toca el estado de sesión en absoluto: solo reenvía la llamada a la API y devuelve la confirmación de que se mandó el código. La sesión real solo se crea en `verificarCodigo2FA`, a través de `aplicarRespuesta`:
```ts
function aplicarRespuesta(response: AuthResponse, recordar = true) {
  const nueva: Sesion = { token: response.token, usuario: response.usuario };
  setSesion(nueva);
  guardarSesion(nueva, recordar);
}
```
que actualiza el estado en memoria (para que React vuelva a renderizar lo que depende de `sesion`) y lo guarda en el almacenamiento elegido, en el mismo paso.

### Cerrar sesión
```ts
function logout() {
  setSesion(null);
  guardarSesion(null, true);
}
```
`guardarSesion(null, true)` limpia ambos almacenamientos (ver la función `guardarSesion` arriba: siempre borra los dos antes de decidir si escribe algo) sin importar el segundo argumento, porque al pasar `sesion = null` nunca llega a ejecutar el `setItem`.

### El hook de acceso y por qué lanza un error si se usa mal
```ts
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  }
  return ctx;
}
```
Si algún componente llamara `useAuth()` fuera del árbol envuelto por `<AuthProvider>` (ver `frontend/app/layout.tsx`, donde envuelve a toda la app), este error avisa inmediatamente en desarrollo en vez de fallar silenciosamente más adelante con un `undefined` difícil de rastrear.

## Conexión con el resto del sistema
- Envuelve toda la app desde `frontend/app/layout.tsx`.
- Usado por `useAuth()` en: `frontend/app/login/page.tsx`, `frontend/app/registro/page.tsx`, `frontend/app/mi-iinicia/page.tsx`, `frontend/app/admin/materias/page.tsx`, `frontend/app/admin/programas/page.tsx`, `frontend/app/admin/usuarios/page.tsx`, `frontend/components/layout/site-header.tsx`.
- Llama a `login`, `verificarCodigo2FA`, `registrarAspirante` de `frontend/lib/api.ts`, que a su vez llaman a `POST /auth/login`, `POST /auth/login/verificar` y `POST /auth/registro`.
- Usa los tipos `AuthResponse`, `LoginInput`, `RegistroAspiranteInput`, `Requiere2FAResponse`, `Usuario` de `frontend/lib/types.ts`.

## Cosas que no son obvias a primera vista
- `login()` nunca abre sesión: solo dispara el envío del código de 2FA. Confundir esto podría hacer pensar, por error, que basta con correo+contraseña para entrar.
- El token de Moodle nunca llega a este archivo ni a ninguna parte del frontend: el `token` que se guarda aquí es el JWT propio de IINICIA, emitido por el backend tras la verificación de 2FA.
- El `try/catch` alrededor de `localStorage`/`sessionStorage` existe porque esos almacenamientos pueden no estar disponibles (navegación privada estricta, políticas del navegador); sin él, la app se rompería en esos casos en vez de simplemente no recordar la sesión entre recargas.
