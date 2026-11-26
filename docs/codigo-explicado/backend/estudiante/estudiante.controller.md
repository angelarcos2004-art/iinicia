# `backend/src/estudiante/estudiante.controller.ts`

**En una frase:** rutas que usa el estudiante autenticado para ver sus cursos y próximas actividades (reales, desde Moodle), registrar el token push de su dispositivo Android, y obtener un enlace de acceso directo (SSO) al campus Moodle.

## Por qué existe

El estudiante necesita ver su progreso académico real, no datos de ejemplo. En vez de que el frontend o Android llamen a Moodle directamente (lo cual violaría la regla de `CLAUDE.md` de que "ningún token de Moodle" sale del backend), este controlador actúa de intermediario: recibe la petición del cliente ya autenticado con JWT, y es el backend quien habla con Moodle usando el token que solo él conoce.

## Recorrido del código

```ts
@Get('cursos')
async misCursos(@UsuarioActual() usuarioActual: UsuarioAutenticado): Promise<CursoInscrito[]> {
  const user = await this.users.findById(usuarioActual.id);
  if (!user?.moodleUserId) {
    return [];
  }
  const cursos = await this.moodle.obtenerCursosDeUsuario(user.moodleUserId);
  return cursos.map((c) => ({ id: c.id, nombre: c.fullname, shortname: c.shortname, progreso: c.progress }));
}
```
Si el usuario todavía no tiene cuenta Moodle vinculada, la respuesta es una lista vacía, **no** un error. Es una decisión explícita: un aspirante recién registrado (o un estudiante que aún no fue vinculado) consultando "mis cursos" es un estado completamente válido de la aplicación, solo que sin contenido todavía — tratarlo como error forzaría al frontend a manejar un caso de falla que en realidad es normal.

```ts
@Get('moodle-sso')
async entrarAlCampus(
  @UsuarioActual() usuarioActual: UsuarioAutenticado,
  @Query('cursoId') cursoId?: string,
  @Query('actividadUrl') actividadUrl?: string,
): Promise<{ url: string }> {
  const user = await this.users.findById(usuarioActual.id);
  if (!user?.moodleUserId) {
    throw new BadRequestException('Tu cuenta todavía no está vinculada a Moodle');
  }
  const url = await this.moodle.solicitarUrlAutologin(user.correo, cursoId ? Number(cursoId) : undefined, actividadUrl);
  return { url };
}
```
Genera una URL de un solo uso que entra a Moodle ya autenticado (SSO vía `auth_userkey`, ver `moodle.service.md`), sin pedir una segunda contraseña al estudiante. Aquí sí es un error (400) si no hay cuenta Moodle vinculada, porque no tiene sentido pedir un SSO a un lugar donde el usuario no existe.

```ts
@Patch('push-token')
async registrarPushToken(@UsuarioActual() usuarioActual: UsuarioAutenticado, @Body() dto: RegistrarPushTokenDto) {
  await this.users.actualizarFcmToken(usuarioActual.id, dto.token);
  return { ok: true };
}
```
Guarda (reemplazando el anterior) el token de Firebase Cloud Messaging del dispositivo Android actual. Este registro es el prerrequisito de `UsuariosController.notificar`: sin un `fcmToken` guardado, ese endpoint rechaza la notificación con 400.

## Conexión con el resto del sistema

- Depende de `UsersService` y `MoodleService`.
- Protegido con `@UseGuards(JwtAuthGuard)` a nivel de controlador (cualquier rol autenticado puede usarlo, no solo "estudiante" — el nombre de la ruta es por convención, no por restricción de rol).
- Lo consumen el portal (dashboard del estudiante) y la app Android.

## Cosas que no son obvias a primera vista

- El controlador se llama "estudiante" pero el guard no restringe por rol (`Rol.Estudiante`): cualquier usuario autenticado con `moodleUserId` puede usar estas rutas (en la práctica, aplica también a profesores si quisieran, aunque no es el flujo pensado).
- `entrarAlCampus` nunca construye la URL base de Moodle usando la variable interna `MOODLE_URL` del backend: delega eso a `MoodleService.solicitarUrlAutologin`, que reutiliza el `loginurl` que Moodle mismo devuelve (ver el porqué en `moodle.service.md`, sección sobre `MOODLE_HOST_HEADER`), porque esa URL interna de Docker no es alcanzable desde el navegador del usuario.
- `misCursos`/`proximasActividades` devolviendo lista vacía en vez de error para una cuenta sin vincular es el mismo patrón en ambos métodos — importante mantenerlo consistente si se agregan más rutas similares.
