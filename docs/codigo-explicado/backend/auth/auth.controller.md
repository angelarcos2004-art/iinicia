# `backend/src/auth/auth.controller.ts`

**En una frase:** expone las rutas HTTP de autenticación (`/auth/login`, `/auth/login/verificar`, `/auth/registro`, `/auth/recuperar`, `/auth/restablecer`, `/auth/me`) y delega toda la lógica a `AuthService`.

## Por qué existe

Es la capa que traduce HTTP (verbos, cuerpos de petición, códigos de estado) a llamadas de negocio. Mantiene fuera de sí misma cualquier decisión (hashear, comparar, decidir expiración): eso vive en `AuthService`. Lo único que añade aquí, además de enrutar, es la protección contra fuerza bruta con `@Throttle`.

## Recorrido del código

```ts
@Throttle({ default: { ttl: 60_000, limit: 5 } })
@Post('login')
@HttpCode(HttpStatus.OK)
login(@Body() dto: LoginDto): Promise<Requiere2FAResponse> {
  return this.auth.login(dto);
}
```
- `@Throttle({ ttl: 60_000, limit: 5 })` sobreescribe, solo para esta ruta, el límite global de 60 peticiones/minuto definido en `AppModule` y lo baja a 5 por minuto. Es la defensa directa contra probar contraseñas por fuerza bruta: el mismo límite estricto se repite en `login/verificar` (evita adivinar el código de 6 dígitos), `registro`, `recuperar` y `restablecer`.
- `@HttpCode(HttpStatus.OK)` fuerza 200 en vez del 201 que Nest usaría por defecto en un `@Post`. Esto está documentado como un requisito explícito: "El contrato del portal espera 200 OK (no 201) en el registro" — el frontend ya está escrito esperando ese código exacto.

```ts
@Throttle({ default: { ttl: 60_000, limit: 5 } })
@Post('recuperar')
@HttpCode(HttpStatus.OK)
async recuperar(@Body() dto: RecuperarDto): Promise<{ mensaje: string }> {
  await this.auth.recuperar(dto.correo);
  return { mensaje: 'Si el correo existe, se envió un enlace de recuperación.' };
}
```
Nótese que el mensaje de respuesta es siempre el mismo texto fijo, sin importar lo que haga `AuthService.recuperar` internamente (si encontró o no la cuenta). Esto es intencional (ver `auth.service.md`): nunca se debe delatar si un correo existe en la plataforma.

```ts
@Get('me')
@UseGuards(JwtAuthGuard)
me(@UsuarioActual() usuario: UsuarioAutenticado): UsuarioAutenticado {
  return usuario;
}
```
Ruta simple que el frontend usa para saber "¿quién soy, con este token?" al cargar la app. `@UsuarioActual()` extrae el usuario que `JwtAuthGuard` ya dejó en la petición (ver `usuario-actual.decorator.md`); nunca se vuelve a decodificar el token aquí.

## Conexión con el resto del sistema

- Delega toda la lógica a `AuthService`.
- Usa los DTOs `LoginDto`, `RegistroDto`, `RecuperarDto`, `RestablecerDto`, `Verificar2FADto` (en `auth/dto/`) para validar automáticamente el cuerpo de cada petición antes de que el método del controlador se ejecute (gracias al `ValidationPipe` global de `app.setup.ts`).
- `me` depende de `JwtAuthGuard` (verifica el token) y del decorador `UsuarioActual`.
- Es consumido por el frontend (formularios de login/registro/recuperación) y por la app Android.

## Cosas que no son obvias a primera vista

- Todas las rutas de este controlador están limitadas a 5 peticiones por minuto por IP, no solo `/login`: el registro y la recuperación de contraseña también son objetivos típicos de abuso automatizado (crear cuentas masivamente, o saturar el envío de correos).
- `/auth/login` y `/auth/login/verificar` nunca devuelven directamente "ese correo no existe" o "esa contraseña es incorrecta" por separado: siempre el mismo mensaje genérico, para no ayudar a un atacante a averiguar cuáles de los dos datos acertó.
- `/auth/me` no decodifica el JWT: confía por completo en que `JwtAuthGuard` + `JwtStrategy` ya resolvieron (y revalidaron contra la base de datos) quién es el usuario actual.
