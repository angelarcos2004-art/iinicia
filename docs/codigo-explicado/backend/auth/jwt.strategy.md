# `backend/src/auth/jwt.strategy.ts`

**En una frase:** define cómo se extrae y valida el token JWT de cada petición, y qué información queda disponible como "el usuario actual" en el resto del backend.

## Por qué existe

Nest usa Passport para implementar estrategias de autenticación. `JwtStrategy` es el "traductor" entre un token JWT crudo (que llega en la cabecera `Authorization: Bearer ...`) y un objeto `UsuarioAutenticado` que el resto del código puede usar sin preocuparse de JWT, firmas ni expiraciones.

## Recorrido del código

```ts
super({
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  ignoreExpiration: false,
  secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
});
```
- El token siempre viaja como `Authorization: Bearer <token>`, nunca en una cookie ni en un query param.
- `ignoreExpiration: false` es explícito (aunque sea el valor por defecto de la librería): un token vencido siempre se rechaza, no hay forma de desactivarlo accidentalmente.
- `JWT_SECRET` se lee con `getOrThrow`: si falta en el `.env`, la aplicación falla al arrancar en vez de arrancar con un secreto vacío o inventado.

```ts
async validate(payload: JwtPayload): Promise<UsuarioAutenticado> {
  const user = await this.users.findById(payload.sub);
  if (!user) {
    throw new UnauthorizedException('Sesión no válida');
  }
  return { id: user.id, nombre: user.nombre, correo: user.correo, rol: user.rol };
}
```
Este método se ejecuta automáticamente después de que Passport verifica la firma y la expiración del token. Lo importante es que **no confía en el contenido del token** más allá del `sub` (id de usuario): vuelve a consultar la base de datos para obtener el nombre, correo y, sobre todo, el **rol actual**. Si en vez de esto se confiara en el `rol` que vino dentro del payload del JWT, un cambio de rol hecho por un administrador (o una baja de cuenta) no tendría efecto hasta que el token expirara por sí mismo — podría ser horas o días, dependiendo de cómo se configure `JwtService`. Volver a la base de datos en cada petición cuesta una consulta extra, pero garantiza que los permisos siempre están al día.

## Conexión con el resto del sistema

- Passport ejecuta esta estrategia cuando una ruta usa `JwtAuthGuard`.
- El resultado de `validate` termina en `request.user`, de donde lo leen `RolesGuard` y el decorador `UsuarioActual`.
- Depende de `UsersService.findById` y de `ConfigService` (para `JWT_SECRET`).
- El tipo `UsuarioAutenticado` que define aquí se reutiliza en casi todos los controladores y guards del backend.

## Cosas que no son obvias a primera vista

- El JWT es intencionalmente "delgado" (solo `sub` y `rol` en el payload que lo firma, ver `auth.service.ts`): toda la demás información del usuario se resuelve consultando la base en cada petición, nunca se confía en una copia vieja dentro del token.
- Si un usuario es eliminado de la base de datos mientras su token sigue siendo válido (no ha expirado), esta estrategia lo detecta aquí (`!user`) y responde 401, no deja pasar la petición con un usuario "fantasma".
