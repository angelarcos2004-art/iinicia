# `backend/src/seed.ts`

**En una frase:** script que se corre a mano (no es parte del servidor HTTP) para dejar la base de datos con un catálogo de programas/materias de ejemplo y una cuenta de prueba por cada rol, vinculada a Moodle cuando corresponde.

## Por qué existe

Para la primera entrega (ver `CLAUDE.md`: "curso y usuarios de prueba") hace falta poder demostrar cada rol sin tener que crear cuentas a mano por SQL o por el formulario de registro una por una. Este script deja la base en un estado conocido y repetible: se puede correr tantas veces como se quiera (antes de una demo, después de recrear la base, etc.) y siempre termina con las mismas credenciales y el mismo catálogo, sin duplicar nada.

## Recorrido del código

```ts
const app = await NestFactory.createApplicationContext(AppModule, {
  logger: ['log', 'warn', 'error'],
});
```
A diferencia de `main.ts` (que usa `NestFactory.create` y levanta un servidor HTTP), aquí se usa `createApplicationContext`: arranca todo el árbol de inyección de dependencias (servicios, TypeORM, etc.) **sin** abrir ningún puerto. Es la forma estándar de escribir un script de una sola vez que necesita los mismos servicios que usa la API.

```ts
for (const data of PROGRAMAS_SEMILLA) {
  const existente = await programas.findById(data.id);
  if (!existente) {
    await programas.crear(data);
  } else {
    await programas.actualizar(data.id, data);
  }
}
```
Patrón "crear o actualizar" (upsert manual) repetido para programas, materias y usuarios: el script siempre deja el catálogo en el estado definido en el código, sin importar si ya existía de una corrida anterior. Esto es lo que permite correrlo repetidamente sin generar duplicados ni fallar por "ya existe".

```ts
if (data.vincularMoodle && user.moodleUserId === null) {
  await vincularYMatricularMoodle({ users, moodle, config, logger }, user);
}
```
Solo la cuenta de estudiante de prueba se vincula automáticamente a Moodle (y solo si `moodleUserId` todavía es `null`, para no repetir la vinculación en cada corrida). El resto de las cuentas (superadmin, admin académico, coordinador) no necesitan cuenta Moodle para existir, siguiendo la misma regla que aplica a cualquier usuario real: "tener una cuenta no debe implicar acceso automático a los cursos" (ver `auth.service.md`).

```ts
async function vincularProfesorComoEditingteacher(...) {
  ...
  for (const shortname of cursos) {
    try {
      await moodle.matricularEnCurso(moodleUserId, shortname, teacherRoleId);
    } catch (error) {
      logger.warn(`No se pudo matricular al profesor ${user.id} en ${shortname} (¿corriste moodle-seed-cursos.php?): ${String(error)}`);
    }
  }
}
```
Caso especial para `profesor.prueba`: se le matricula como `editingteacher` (no como estudiante) en una lista fija de cursos reales que ya existen en Moodle gracias a otro script, `infrastructure/moodle-seed-cursos.php`. Si ese script todavía no corrió en la máquina actual, el curso simplemente no existe en Moodle y la matrícula de *ese* curso falla con un `warn`, pero el bucle sigue con los demás cursos en vez de abortar todo el seed. Esto es deliberado: el seed de usuarios de IINICIA y el seed de contenido de Moodle son scripts independientes, y uno no debe tronar si el otro no se ha ejecutado todavía.

```ts
if (data.cursosProfesor) {
  await vincularProfesorComoEditingteacher(...);
}
```
Nótese que esta llamada **no** está protegida por `moodleUserId === null` como la del estudiante: se ejecuta en cada corrida del seed a propósito. Esto es seguro porque `buscarOCrearUsuarioMoodle` y `matricularEnCurso` son idempotentes (ver `moodle.service.md`): repetir la llamada nunca duplica nada, y permite que una corrida posterior complete matrículas que faltaron en la corrida anterior (por ejemplo, si `moodle-seed-cursos.php` se corrió después).

## Conexión con el resto del sistema

- Usa `UsersService`, `ProgramasService`, `MateriasService`, `MoodleService` y `vincularYMatricularMoodle` (de `moodle-onboarding.ts`) — exactamente los mismos servicios que usa la API en caliente, no una copia paralela.
- Depende de que `infrastructure/moodle-seed-cursos.php` ya haya corrido para que los cursos reales (`IINICIA-SOFT1`, `IINICIA-CIBER1`, etc.) existan en Moodle; si no, solo se advierte y se sigue.
- Se invoca manualmente (por ejemplo `npm run seed` o similar, ver `backend/package.json`), nunca desde el flujo HTTP normal.

## Cosas que no son obvias a primera vista

- El catálogo de `PROGRAMAS_SEMILLA` está sincronizado a mano con `frontend/lib/mock-data.ts` (`MOCK_PROGRAMAS`): la intención es que ambos muestren lo mismo mientras el portal migra de datos de ejemplo a consumir `GET /programas` de verdad.
- Solo `lic-software-ia` tiene una cadena real de prerequisitos en `MATERIAS_SEMILLA`; el resto de las carreras tiene una sola materia suelta (sin prerequisitos) solo para que su catálogo no aparezca vacío en el panel `/admin/materias`.
- El seed **reafirma** contraseña, nombre y rol de los usuarios de prueba en cada corrida, incluso si la cuenta ya existía con otros datos — por ejemplo, si alguien se autorregistró antes como aspirante usando ese mismo correo. Esto es intencional: la demo necesita credenciales conocidas siempre, sin excepciones.
- `BCRYPT_ROUNDS = 10` es el mismo valor que usa `AuthService`: si cambiara en un archivo y no en el otro, no rompería nada funcionalmente (bcrypt guarda el número de rounds en el propio hash), pero sí generaría inconsistencia de costo de cómputo entre cuentas creadas por uno u otro camino.
