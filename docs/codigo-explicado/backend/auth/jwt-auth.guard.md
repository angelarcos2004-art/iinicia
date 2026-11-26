# `backend/src/auth/jwt-auth.guard.ts`

**En una frase:** guard que exige un token JWT válido en la petición; sin él (o si es inválido/expiró), responde 401 antes de que la petición llegue al controlador.

## Por qué existe

NestJS separa "¿quién eres?" (autenticación, este guard) de "¿qué puedes hacer?" (autorización, `RolesGuard`). Esta separación permite que algunas rutas solo necesiten `JwtAuthGuard` (cualquier usuario con sesión, sin importar el rol — por ejemplo `/estudiante/cursos`) y otras necesiten ambos guards encadenados (rutas restringidas a ciertos roles).

## Recorrido del código

```ts
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
```
Es, literalmente, todo el archivo: una subclase vacía de `AuthGuard('jwt')` de `@nestjs/passport`, que internamente ejecuta `JwtStrategy` (la estrategia nombrada `'jwt'` en `PassportStrategy(Strategy, 'jwt')`, ver `jwt.strategy.ts`). No necesita más código porque toda la lógica real ya vive en la estrategia.

## Conexión con el resto del sistema

- Se usa con `@UseGuards(JwtAuthGuard)` en cualquier controlador o ruta que requiera sesión iniciada (`AuthController.me`, `EstudianteController`, `AspiranteController`, `UsuariosController`, `DocumentosController`, `MateriasController`, etc.).
- Cuando pasa, deja el usuario resuelto en `request.user` (puesto ahí por `JwtStrategy.validate`), que luego leen `RolesGuard` y `UsuarioActual`.
- Siempre debe ir **antes** de `RolesGuard` en la lista de `@UseGuards(...)`: `RolesGuard` asume que `request.user` ya existe.

## Cosas que no son obvias a primera vista

- Que el archivo esté casi vacío no significa que no haga nada: toda la validación (firma, expiración, existencia del usuario) ocurre dentro de `JwtStrategy`, que Passport ejecuta automáticamente al activarse este guard.
- No decide nada sobre roles o permisos: solo decide si hay una sesión válida. La decisión de "pero, ¿puede este rol hacer esto?" es responsabilidad exclusiva de `RolesGuard`.
