# `backend/src/app.module.ts`

**En una frase:** es el módulo raíz de NestJS: declara qué módulos existen, cómo se conecta a PostgreSQL y aplica el límite global de peticiones por IP.

## Por qué existe

NestJS organiza la aplicación en módulos (cada carpeta de `backend/src/` suele ser uno: `auth`, `users`, `moodle`, etc.). Necesita un módulo raíz que los reúna a todos y configure los servicios transversales (base de datos, variables de entorno, rate limiting) que no pertenecen a ningún módulo de negocio en particular.

## Recorrido del código

```ts
ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }]),
```
Límite global: cualquier IP puede hacer como máximo 60 peticiones por minuto a cualquier ruta. Es la defensa base contra abuso/DoS accidental. Rutas especialmente sensibles (como `/auth/login`, que si no se limita permite probar contraseñas por fuerza bruta) usan un límite más estricto con el decorador `@Throttle(...)` directamente en el controlador (ver `auth.controller.ts`), que sobreescribe este valor global solo para esa ruta.

```ts
TypeOrmModule.forRootAsync({
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({
    type: 'postgres' as const,
    url: config.getOrThrow<string>('DATABASE_URL'),
    entities: [User, Programa, Materia, Documento],
    synchronize: config.get<string>('DB_SYNCHRONIZE', 'true') === 'true',
  }),
}),
```
- `forRootAsync` (en vez de `forRoot`) porque la URL de conexión depende de `ConfigService`, que a su vez depende de que `ConfigModule.forRoot` ya haya cargado el `.env`.
- `entities` lista manualmente las 4 clases marcadas con `@Entity(...)` (`User`, `Programa`, `Materia`, `Documento`) en vez de usar un glob automático — así se ve explícitamente cuáles tablas existen sin tener que buscarlas por el proyecto.
- `synchronize` hace que TypeORM cree/actualice las tablas automáticamente a partir de las entidades, sin migraciones manuales. El comentario en el código es explícito: esto es aceptable **solo** para la primera entrega/desarrollo; en producción se debe pasar a migraciones versionadas, porque `synchronize` puede borrar datos al detectar cambios de esquema.

```ts
providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
```
Registra `ThrottlerGuard` como guard global (`APP_GUARD`), es decir, se ejecuta en *todas* las rutas automáticamente, sin tener que poner `@UseGuards(ThrottlerGuard)` en cada controlador.

## Conexión con el resto del sistema

- Importa y conecta todos los módulos de negocio: `AspiranteModule`, `AuthModule`, `EstudianteModule`, `MateriasModule`, `MoodleModule`, `ProgramasModule`, `UsersModule`, `UsuariosModule`, `DocumentosModule`.
- Es el módulo que `main.ts` pasa a `NestFactory.create(...)`.
- Las entidades que registra (`User`, `Programa`, `Materia`, `Documento`) son las mismas clases documentadas en `users/user.entity.md`, `programas/programa.entity.md`, `materias/materia.entity.md` y `documentos/documento.entity.md`.

## Cosas que no son obvias a primera vista

- `synchronize: true` (el valor por defecto si `DB_SYNCHRONIZE` no está en `.env`) es deliberadamente peligroso para producción: el comentario en el código lo marca como "solo para desarrollo de la primera entrega". Antes de un despliegue real hay que desactivarlo y usar migraciones de TypeORM.
- El límite de 60 peticiones/minuto es *por IP*, no por usuario autenticado: varios usuarios detrás del mismo NAT/proxy comparten ese límite.
- No se declaran los módulos *.module.ts individuales en este documento (son boilerplate de NestJS: cada uno solo junta un controlador con su servicio y su repositorio de TypeORM); se mencionan aquí de paso porque es `AppModule` quien los conecta todos.
