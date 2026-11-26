# `backend/src/materias/materia.entity.ts`

**En una frase:** define la tabla `materias`: cada fila conecta un curso real de Moodle con una carrera del catálogo de IINICIA, y opcionalmente con otras materias que hay que aprobar antes.

## Por qué existe

Moodle no tiene concepto de "carrera" ni de "prerequisito entre cursos" de la forma en que IINICIA necesita modelarlo para la seriación académica. Esta tabla es la capa propia del backend que agrega ese significado: "este curso de Moodle, dentro de esta carrera, requiere haber aprobado estos otros cursos primero".

## Recorrido del código

```ts
@PrimaryColumn({ type: 'varchar', length: 100 })
id!: string;
```
A diferencia de `User` o `Documento` (que usan UUID autogenerado), aquí el `id` es un slug legible elegido a mano por el administrador (por ejemplo `soft-fundamentos-ia`), igual que en `Programa`. Tiene sentido porque estas filas se crean y mantienen manualmente desde un panel administrativo (y desde `seed.ts`), no por usuarios finales — un id legible facilita leer y depurar los datos directamente.

```ts
@Column({ name: 'moodle_course_shortname', type: 'varchar', length: 100 })
moodleCourseShortname!: string;
```
El enlace real con Moodle: no es el id numérico interno de Moodle, sino el `shortname` (el "código corto" visible del curso, como `IINICIA101`), porque es el identificador estable que usan los administradores al configurar cursos en Moodle y que ya se usa en otras partes del sistema (`Programa.moodleCourseShortname`, `moodle.service.ts`).

```ts
@Column({ type: 'simple-array', default: '' })
prerequisitos!: string[];
```
`simple-array` es el tipo de columna de TypeORM que guarda un arreglo de strings como texto separado por comas en una sola columna (en vez de una tabla intermedia de relación muchos-a-muchos). Es la opción más simple posible para una lista corta de ids de materias — suficiente mientras el número de prerequisitos por materia sea pequeño, a costa de no poder hacer consultas SQL eficientes tipo "¿qué materias requieren la materia X?" (eso se resuelve en código, en `MateriasService.eliminar`, trayendo todas las materias del programa y filtrando en memoria).

## Conexión con el resto del sistema

- Se registra en `AppModule` (`entities: [..., Materia]`).
- La usa `MateriasService` para el CRUD y para `verificarPrerequisitos`.
- `programaId` referencia (sin relación formal) a `Programa.id`.
- `moodleCourseShortname` es el puente hacia `MoodleService.obtenerCursosAprobados`, que reporta qué cursos tiene aprobados un usuario en Moodle usando ese mismo shortname.

## Cosas que no son obvias a primera vista

- Que un curso de Moodle no tenga fila en esta tabla no es un error: simplemente significa que ese curso no tiene seriación (cualquiera puede matricularse sin restricción). La ausencia de una fila es un estado válido, no una falta de datos.
- `prerequisitos` guarda ids de *materias* (filas de esta misma tabla), no shortnames de Moodle directamente — por eso `MateriasService.verificarPrerequisitos` tiene que hacer un paso intermedio (`this.repo.find({ where: { id: In(materia.prerequisitos) } })`) para traducir esos ids a los `moodleCourseShortname` reales antes de poder comparar contra lo que reporta Moodle.
