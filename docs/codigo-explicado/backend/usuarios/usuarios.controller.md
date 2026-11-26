# `backend/src/usuarios/usuarios.controller.ts`

**En una frase:** panel de administración de usuarios: listar, filtrar por ámbito, asignar rol/ámbito de coordinador, matricular manualmente en Moodle, ver "mis estudiantes" (profesor) y enviar notificaciones push controladas.

## Por qué existe

Implementa el paso de "admisión" descrito en `docs/requerimientos.md §12`: un administrador académico autoriza a un aspirante y el sistema lo vincula/matricula en Moodle automáticamente. También concentra las demás acciones administrativas sobre cuentas que requieren roles privilegiados (`superadmin`, `admin_academico`, `coordinador`, `profesor`, según la ruta).

## Recorrido del código

### Listado con ámbito de coordinador

```ts
@Get()
@Roles(Rol.Superadmin, Rol.AdminAcademico, Rol.Coordinador)
async listar(@UsuarioActual() actual: UsuarioAutenticado, @Query('rol') rol?: string): Promise<UsuarioListado[]> {
  if (rol && !Object.values(Rol).includes(rol as Rol)) {
    throw new BadRequestException('Rol inválido');
  }
  let usuarios = await this.users.listar(rol as Rol | undefined);
  if (actual.rol === Rol.Coordinador) {
    const coordinador = await this.users.findById(actual.id);
    const ambito = coordinador?.programaCoordinadoId ?? null;
    if (ambito) {
      usuarios = usuarios.filter((u) => u.programaInteresId === ambito);
    }
  }
  ...
}
```
El filtrado por ámbito de coordinador se aplica *después* de traer la lista completa, no en la consulta SQL — una decisión simple a costa de algo de eficiencia (aceptable con el volumen de usuarios de esta entrega), que evita duplicar la condición `WHERE` en varios lugares. Si el coordinador no tiene ámbito asignado, ve todo, igual que superadmin/admin_academico.

### "Mis estudiantes" del profesor, sin exponer la lista global

```ts
private async estudiantesRealesDe(profesor: User): Promise<EstudianteDeProfesor[]> {
  if (!profesor.moodleUserId) return [];
  const cursos = await this.moodle.obtenerCursosDeUsuario(profesor.moodleUserId);
  const porCorreo = new Map<string, { nombre: string; cursos: Set<string> }>();
  for (const curso of cursos) {
    const estudiantes = await this.moodle.obtenerEstudiantesDeCurso(curso.id);
    for (const estudiante of estudiantes) {
      const entrada = porCorreo.get(estudiante.email) ?? { nombre: estudiante.fullname, cursos: new Set() };
      entrada.cursos.add(curso.fullname);
      porCorreo.set(estudiante.email, entrada);
    }
  }
  ...
}
```
En vez de consultar una lista de usuarios de IINICIA y adivinar qué cursos comparten, se le pregunta **a Moodle** qué cursos imparte este profesor y quién está inscrito como `student` en cada uno — la fuente de verdad real de "quién es alumno de quién" es Moodle, no una copia local. Esto implementa literalmente el requisito de que un profesor "no puede administrar usuarios globales" (`docs/requerimientos.md §11`): nunca ve la tabla completa de usuarios, solo quienes de verdad comparten un curso real con él.

Un estudiante inscrito en Moodle pero sin cuenta de portal vinculada (por ejemplo, generado por una herramienta de prueba de Moodle) se descarta con `if (!usuario) continue;`: no hay a quién notificar en la app si no existe esa cuenta.

### Admisión: cambio de rol con vinculación automática

```ts
@Patch(':id/rol')
@Roles(Rol.Superadmin, Rol.AdminAcademico)
async actualizarRol(@Param('id') id: string, @Body() dto: ActualizarRolDto): Promise<UsuarioActualizado> {
  ...
  await this.users.actualizarRol(id, dto.rol);
  user.rol = dto.rol;
  if (dto.rol === Rol.Estudiante && user.moodleUserId === null) {
    const curso = await this.programas.obtenerMoodleCourseShortname(user.programaInteresId);
    user = await vincularYMatricularMoodle({ users: this.users, moodle: this.moodle, config: this.config, logger: this.logger }, user, curso);
  }
  return { id: user.id, nombre: user.nombre, correo: user.correo, rol: user.rol };
}
```
Al admitir a un aspirante (promoverlo a `estudiante`) sin cuenta Moodle previa, el sistema automáticamente lo vincula/matricula en el curso de su programa de interés (el que eligió al registrarse) — o en `MOODLE_TEST_COURSE` si ese programa todavía no tiene un curso real asignado. El `moodleUserId === null` evita repetir esto si el usuario ya estaba vinculado (por ejemplo, si alguien le bajara el rol y luego lo volviera a subir).

### Matrícula manual en un curso elegido

```ts
@Post(':id/matricula')
@Roles(Rol.Superadmin, Rol.AdminAcademico)
async asignarCurso(@Param('id') id: string, @Body() dto: AsignarCursoDto): Promise<UsuarioListado> {
  ...
  await this.materias.verificarPrerequisitos(user, dto.cursoShortname);
  const actualizado = await vincularYMatricularMoodle(...);
  ...
}
```
A diferencia de `actualizarRol` (que infiere el curso automáticamente), aquí el administrador elige explícitamente el curso (de la lista real que da `GET /usuarios/cursos-moodle`). Antes de matricular, se valida la seriación (`materias.verificarPrerequisitos`): si el curso corresponde a una materia con prerequisitos sin aprobar, la matrícula se bloquea con un mensaje explicando qué falta.

### Notificaciones controladas

```ts
@Post(':id/notificar')
@Roles(Rol.Superadmin, Rol.AdminAcademico, Rol.Coordinador, Rol.Profesor)
async notificar(@UsuarioActual() actual: UsuarioAutenticado, @Param('id') id: string, @Body() dto: NotificarDto) {
  ...
  if (actual.rol === Rol.Coordinador) {
    await verificarAmbitoCoordinador(this.users, actual, user.programaInteresId);
  }
  if (actual.rol === Rol.Profesor) {
    const profesor = await this.users.findById(actual.id);
    const estudiantes = profesor ? await this.estudiantesRealesDe(profesor) : [];
    if (!estudiantes.some((e) => e.id === id)) {
      throw new ForbiddenException('Este estudiante no está en tus cursos');
    }
  }
  if (!user.fcmToken) {
    throw new BadRequestException('Este usuario no tiene un dispositivo registrado para notificaciones');
  }
  await this.push.enviar(user.fcmToken, dto.titulo, dto.mensaje, dto.cursoId ? { cursoId: dto.cursoId } : undefined);
  return { enviado: true };
}
```
Cada rol que puede notificar tiene su propia restricción adicional: un coordinador solo puede notificar dentro de su ámbito de programa, y un profesor solo puede notificar a alguien que de verdad está en `estudiantesRealesDe(profesor)` — es decir, que comparte un curso real con él en Moodle. El comentario del código menciona explícitamente que esta restricción de profesor corrige una vulnerabilidad de "notification spoofing" (suplantación) encontrada en la auditoría de seguridad: sin ella, cualquier profesor podría notificar a cualquier usuario del sistema, no solo a sus propios alumnos.

## Conexión con el resto del sistema

- Depende de `UsersService`, `MoodleService`, `ConfigService`, `PushService`, `ProgramasService`, `MateriasService`.
- Usa `vincularYMatricularMoodle` (`moodle/moodle-onboarding.ts`) y `verificarAmbitoCoordinador` (`auth/ambito-coordinador.ts`).
- Está detrás de `JwtAuthGuard` + `RolesGuard` en todo el controlador, con roles específicos por ruta.

## Cosas que no son obvias a primera vista

- `estudiantesRealesDe` hace una llamada a Moodle por cada curso del profesor (`obtenerEstudiantesDeCurso`), no una sola consulta agregada: aceptable mientras el número de cursos por profesor sea pequeño, pero sería un punto a optimizar si crece.
- El filtro de ámbito de coordinador en `listar` se hace en memoria tras traer todos los usuarios, no en la consulta SQL.
- `notificar` requiere que el usuario destino ya haya abierto la app Android con sesión iniciada al menos una vez (eso es lo que registra `fcmToken`, ver `estudiante.controller.md`); sin eso, responde 400 en vez de fallar silenciosamente.
