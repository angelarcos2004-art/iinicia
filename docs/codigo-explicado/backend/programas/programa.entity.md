# `backend/src/programas/programa.entity.ts`

**En una frase:** define la tabla `programas`: el catálogo de oferta académica (licenciaturas, diplomados, certificaciones) que ve un aspirante al elegir qué estudiar.

## Por qué existe

Es el modelo de datos detrás del catálogo que muestra el home del portal y el formulario de registro. Antes de que existiera esta tabla, ese catálogo vivía como datos de ejemplo fijos en el frontend (`frontend/lib/mock-data.ts`); esta entidad es el paso hacia que el backend sea la fuente de verdad real.

## Recorrido del código

```ts
@PrimaryColumn({ type: 'varchar', length: 100 })
id!: string;
```
El comentario del código explica por qué el `id` es un slug de texto legible (como `lic-software-ia`) y no un UUID autogenerado: "ya se usa como valor libre en `User.programaInteresId` desde el registro de aspirantes". Es decir, el frontend ya conocía y enviaba estos ids como texto desde antes de que esta tabla formal existiera, así que mantenerlos como slugs legibles evita tener que migrar datos existentes o cambiar el contrato con el frontend.

```ts
export type TipoPrograma = 'licenciatura' | 'diplomado' | 'certificacion';
export type ModalidadPrograma = 'en_linea' | 'hibrida';
```
Igual que en `Documento`, se usan uniones de literales de texto en vez de un enum formal: combinan bien con `class-validator` (`@IsIn([...])`) en los DTOs.

```ts
@Column({ name: 'moodle_course_shortname', type: 'varchar', length: 100, nullable: true })
moodleCourseShortname!: string | null;
```
El comentario aclara el significado de `null`: "todavía no tiene curso real asignado; se usa `MOODLE_TEST_COURSE` como respaldo" — ver `moodle-onboarding.ts`. Esto permite que el catálogo completo de programas exista en el portal (para que el registro de aspirantes funcione) aunque todavía no se haya creado un curso real en Moodle para cada uno — justo la situación de la mayoría de los programas de `seed.ts`, salvo `lic-software-ia`.

## Conexión con el resto del sistema

- Se registra en `AppModule` (`entities: [..., Programa]`).
- La usa `ProgramasService` (CRUD) y, de forma indirecta, `RegistroDto`/`AuthService` (el `programaInteresId` de un usuario apunta a un `Programa.id`) y `MateriasService` (cada `Materia.programaId` también apunta aquí).

## Cosas que no son obvias a primera vista

- No hay ninguna restricción a nivel de base de datos (foreign key) entre `User.programaInteresId` y `Programa.id`, ni entre `Materia.programaId` y `Programa.id`: la relación es solo lógica, validada en el código de cada servicio (por ejemplo, `AsignarProgramaCoordinadoDto` verifica que el programa exista antes de asignarlo). Borrar un programa con usuarios o materias que lo referencian no está protegido por la base de datos.
