# `backend/src/users/user.entity.ts`

**En una frase:** define la tabla `users` (el modelo de TypeORM) con todos los campos que necesita una cuenta de IINICIA: identidad, credenciales, rol, vínculo con Moodle, ámbito de coordinador y los datos temporales de 2FA/recuperación de contraseña.

## Por qué existe

Es el mapeo entre las clases de TypeScript y la tabla real en PostgreSQL. Con `synchronize: true` (ver `app.module.md`), esta clase es, hoy, la única fuente de verdad del esquema de la tabla: cualquier columna que no esté aquí no existe en la base.

## Recorrido del código

```ts
@PrimaryGeneratedColumn('uuid')
id!: string;
```
El identificador interno es un UUID generado por la base, nunca el correo ni un número autoincremental. Esto es explícitamente la regla de "integración con Moodle idempotente: UUID interno + moodleUserId" de `CLAUDE.md`: IINICIA necesita un identificador propio y estable que nunca dependa de datos externos (el correo puede, en teoría, cambiar; un autoincremental sería predecible/enumerable).

```ts
@Column({ name: 'moodle_user_id', type: 'int', nullable: true, unique: true })
moodleUserId!: number | null;
```
Es `nullable` porque muchas cuentas (aspirantes recién registrados, o roles administrativos que nunca necesitan entrar a Moodle) legítimamente no tienen vínculo. Es `unique` porque un mismo usuario de Moodle nunca debería terminar vinculado a dos cuentas distintas de IINICIA — esa restricción en la base es la verdadera garantía de idempotencia, más allá de que el código intente buscar antes de crear.

```ts
@Column({ name: 'programa_coordinado_id', type: 'varchar', length: 100, nullable: true })
programaCoordinadoId!: string | null;
```
Solo tiene efecto cuando `rol = coordinador` (ver `ambito-coordinador.ts`); `null` significa "sin ámbito asignado, ve todo". El comentario del código cita directamente el requisito (`docs/requerimientos.md §11`).

```ts
@Column({ name: 'reset_password_token_hash', type: 'varchar', length: 100, nullable: true })
resetPasswordTokenHash!: string | null;
...
@Column({ name: 'two_factor_code_hash', type: 'varchar', length: 100, nullable: true })
twoFactorCodeHash!: string | null;
```
Ni el token de recuperación ni el código de verificación en dos pasos se guardan en texto plano: siempre su hash (bcrypt), igual que la contraseña. Cada uno tiene su propia columna de expiración (`resetPasswordExpira`, `twoFactorCodeExpira`) para que `AuthService` pueda invalidar el valor por tiempo sin tener que borrar la fila.

```ts
@Column({ name: 'fcm_token', type: 'varchar', length: 255, nullable: true })
fcmToken!: string | null;
```
Token de Firebase Cloud Messaging del dispositivo Android más reciente del usuario. Es de un solo valor (no un arreglo de dispositivos): si el usuario inicia sesión en un dispositivo nuevo, el anterior deja de recibir notificaciones push — una limitación conocida y aceptada para la primera entrega.

## Conexión con el resto del sistema

- Es la entidad central: casi todos los módulos dependen de ella, directa o indirectamente (`auth`, `usuarios`, `estudiante`, `aspirante`, `documentos` vía `userId`, `materias` vía `verificarPrerequisitos`).
- Se registra en `AppModule` (`entities: [User, ...]`).
- `UsersService` es el único punto que debería leer/escribir esta tabla.

## Cosas que no son obvias a primera vista

- El uso de UUID en vez de un id autoincremental no es solo preferencia de estilo: es parte explícita de la estrategia de integración idempotente con Moodle descrita en `CLAUDE.md`.
- `moodleUserId` siendo `unique` es la garantía real (a nivel de base de datos) de que nunca habrá dos cuentas de IINICIA apuntando al mismo usuario de Moodle, incluso si hubiera un error de lógica en el código que las vincula.
- Esta clase nunca valida nada (eso es trabajo de los DTOs con `class-validator`, ver por ejemplo `registro.dto.ts`); solo declara la forma y el tipo de cada columna.
