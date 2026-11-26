# `backend/src/documentos/documento.entity.ts`

**En una frase:** define la tabla `documentos`: cada fila es un archivo que un aspirante subió como parte de su proceso de admisión, con su estado de revisión.

## Por qué existe

Es el modelo de datos que soporta el flujo de admisión descrito en `docs/requerimientos.md §12`. Separar esta tabla de `users` permite que un mismo usuario tenga varios documentos (identificación, comprobante de estudios, otros) sin forzar columnas fijas en `User` para cada tipo posible.

## Recorrido del código

```ts
export type TipoDocumento = 'identificacion' | 'comprobante_estudios' | 'otro';
export type EstadoDocumento = 'pendiente' | 'aprobado' | 'rechazado';
```
Ambos son uniones de literales de texto (no un enum de TypeORM): más simples de usar junto con `class-validator` (`@IsIn([...])`, ver `dto/subir-documento.dto.ts` y `dto/actualizar-estado-documento.dto.ts`) y de serializar/deserializar en JSON sin capas intermedias.

```ts
@Column({ name: 'user_id', type: 'uuid' })
userId!: string;
```
Relación simple por id (no una relación `@ManyToOne` completa de TypeORM con `User`): suficiente para este caso de uso, donde casi siempre se consulta "documentos de este usuario" o "usuario dueño de este documento" con una consulta directa, sin necesitar joins automáticos ni cascadas.

```ts
@Column({ name: 'ruta_archivo', type: 'varchar', length: 500 })
rutaArchivo!: string;
```
El comentario del código es explícito: "nunca se expone al cliente, solo el id". Esta columna guarda la ruta absoluta en el disco del servidor (generada por `storage.ts` con un nombre `randomUUID()`), y solo la lee internamente `DocumentosController.descargar` para abrir el archivo — nunca aparece en una respuesta JSON (ver `mapearDocumento` en `documentos.service.ts`).

```ts
@Column({ type: 'varchar', length: 20, default: 'pendiente' })
estado!: EstadoDocumento;
```
Todo documento nace `pendiente`; solo se mueve a `aprobado`/`rechazado` mediante una revisión administrativa explícita (`DocumentosController.revisar`).

## Conexión con el resto del sistema

- Se registra en `AppModule` (`entities: [..., Documento]`).
- La usan `DocumentosService` (acceso a datos), `AspiranteController` (creación) y `DocumentosController` (revisión y descarga).
- `userId` referencia (sin relación formal de TypeORM) a `User.id`.

## Cosas que no son obvias a primera vista

- No hay una restricción a nivel de base de datos que impida que un `userId` apunte a un usuario que ya no existe (no hay `@ManyToOne` con `onDelete`): si un usuario se borrara, sus documentos quedarían huérfanos en la tabla. No es un problema hoy porque el sistema no borra usuarios, solo cambia su rol.
- `nombreOriginal` sí se expone al cliente (a diferencia de `rutaArchivo`): es seguro porque es solo texto descriptivo elegido por el propio usuario al subir el archivo, no una ruta del sistema de archivos.
