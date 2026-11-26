# `backend/src/auth/usuario-actual.decorator.ts`

**En una frase:** decorador de parámetro `@UsuarioActual()` que permite a cualquier controlador recibir directamente el usuario autenticado, sin leer manualmente la petición HTTP.

## Por qué existe

Sin este decorador, cada método de controlador que necesite saber "quién hace esta petición" tendría que recibir el objeto `Request` completo e ir a buscar `request.user` a mano (`@Req() req: Request` y luego `req.user`). Repetir eso en cada ruta es ruido y es fácil de teclear mal; `createParamDecorator` permite inyectar justo esa pieza, ya tipada como `UsuarioAutenticado`.

## Recorrido del código

```ts
export const UsuarioActual = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): UsuarioAutenticado =>
    ctx.switchToHttp().getRequest<Request & { user: UsuarioAutenticado }>().user,
);
```
Simplemente devuelve `request.user`. No valida nada ni lanza errores: asume que para cuando se ejecuta, `JwtAuthGuard` (y su `JwtStrategy`) ya corrieron y dejaron ese valor puesto. Si se usara `@UsuarioActual()` en una ruta sin `JwtAuthGuard`, el valor vendría `undefined`.

## Conexión con el resto del sistema

- Usado en casi todos los controladores protegidos: `AuthController.me`, `EstudianteController`, `AspiranteController`, `UsuariosController`, `DocumentosController`.
- Depende de que `JwtAuthGuard` + `JwtStrategy` hayan puesto `request.user` antes.
- El tipo `UsuarioAutenticado` viene de `jwt.strategy.ts`.

## Cosas que no son obvias a primera vista

- Es puramente un atajo de lectura: no agrega seguridad por sí mismo. La seguridad real ya la dio `JwtAuthGuard` antes; si alguien quitara ese guard de una ruta pero dejara `@UsuarioActual()`, el método recibiría `undefined` en tiempo de ejecución en vez de fallar en tiempo de compilación.
