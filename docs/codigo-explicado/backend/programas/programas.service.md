# `backend/src/programas/programas.service.ts`

**En una frase:** acceso a la tabla `programas` (el catálogo de oferta académica) y la función que resuelve a qué curso de Moodle corresponde el programa de interés de un usuario.

## Por qué existe

El catálogo de programas (licenciaturas, diplomados, certificaciones) es la base sobre la que se construye el registro de aspirantes, la admisión y la seriación de materias. Este servicio es el único punto de acceso a esa tabla.

## Recorrido del código

```ts
async obtenerMoodleCourseShortname(programaId: string | null): Promise<string | null> {
  if (!programaId) return null;
  const programa = await this.findById(programaId);
  return programa?.moodleCourseShortname ?? null;
}
```
Esta función es la que usa `UsuariosController.actualizarRol` para decidir en qué curso matricular automáticamente a un aspirante recién admitido: toma el programa de interés que el usuario eligió al registrarse y busca su `moodleCourseShortname`. Si el programa no existe, o no tiene un curso asignado todavía (`null`), la función también devuelve `null` — y es `vincularYMatricularMoodle` (en `moodle-onboarding.ts`) quien decide, en ese caso, usar `MOODLE_TEST_COURSE` como respaldo, no este servicio.

```ts
async crear(dto: CrearProgramaDto): Promise<Programa> {
  if (await this.findById(dto.id)) {
    throw new BadRequestException('Ya existe un programa con ese id');
  }
  const programa = this.repo.create({ ...dto, moodleCourseShortname: dto.moodleCourseShortname ?? null });
  return this.repo.save(programa);
}
```
`moodleCourseShortname` se normaliza explícitamente a `null` si no viene en el DTO, en vez de dejarlo `undefined` — importante porque la columna es `nullable` y el resto del sistema (`obtenerMoodleCourseShortname`, `materias.service.ts`) espera comparar contra `null` de forma consistente.

## Conexión con el resto del sistema

- Lo usan `ProgramasController` (CRUD), `AuthService`/`AspiranteController` indirectamente (a través del `programaInteresId` del usuario), `UsuariosController.actualizarRol` (para resolver el curso de matrícula automática) y `MateriasService` (cuando valida que un prerequisito pertenezca al mismo programa).
- Opera sobre la entidad `Programa` (`programa.entity.ts`).

## Cosas que no son obvias a primera vista

- Esta clase nunca habla con Moodle directamente: solo guarda el `shortname` como un texto. Es `MoodleService` quien decide si ese shortname corresponde a un curso real y qué hacer con él.
- `obtenerMoodleCourseShortname` acepta `programaId: string | null`: está pensado para recibir directamente `user.programaInteresId` (que también puede ser `null` para un usuario sin programa elegido) sin que quien lo llama tenga que chequear eso antes.
