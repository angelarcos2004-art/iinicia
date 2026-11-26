# `backend/src/aspirante/aspirante.controller.ts`

**En una frase:** autoservicio del aspirante durante su proceso de admisión: ver el estado real de su solicitud, y subir los documentos que el comité va a revisar.

## Por qué existe

Implementa el lado "del aspirante" de `docs/requerimientos.md §12`: después de registrarse, el aspirante necesita completar su perfil, subir documentos y poder ver en qué va su solicitud, sin que la autorización final (pasar a ser estudiante) dependa de él mismo — eso sigue siendo una decisión manual de un administrador (`UsuariosController.actualizarRol`).

## Recorrido del código

```ts
@Controller('aspirante')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Rol.Aspirante)
export class AspiranteController { ... }
```
Todo el controlador está restringido al rol `aspirante` a nivel de clase: en el momento en que un usuario es promovido a `estudiante`, automáticamente deja de poder usar estas rutas (`RolesGuard` lo bloquearía), sin necesidad de ningún chequeo adicional.

```ts
@Get('solicitud')
async solicitud(@UsuarioActual() actual: UsuarioAutenticado): Promise<SolicitudAspirante> {
  const user = await this.users.findById(actual.id);
  const docs = await this.documentos.listarPorUsuario(actual.id);
  const programa = user?.programaInteresId ? await this.programas.findById(user.programaInteresId) : null;
  const perfilCompleto = !!user?.programaInteresId;
  const documentosCargados = docs.length > 0;
  const admitido = user?.rol === Rol.Estudiante;
  return {
    programaNombre: programa?.nombre ?? 'Sin programa seleccionado',
    estado: admitido ? 'admitido' : 'en_revision',
    pasos: [
      { label: 'Cuenta creada', completado: true },
      { label: 'Perfil y programa seleccionados', completado: perfilCompleto },
      { label: 'Documentos cargados', completado: documentosCargados },
      { label: 'Dictamen del comité', completado: admitido },
    ],
  };
}
```
Construye una especie de "barra de progreso" de 4 pasos para la pantalla del aspirante. El comentario del código señala algo sutil: como el `@Roles(Rol.Aspirante)` ya exige que el usuario sea aspirante para poder llegar a este método, la condición `admitido` nunca es `true` en la práctica hoy — un usuario que ya fue promovido a estudiante dejaría de poder entrar a esta ruta antes de llegar a evaluar esa condición. Se deja la lógica real (en vez de hardcodear `false`) a propósito, pensando en el momento en que el frontend recargue el estado del usuario justo después de la promoción, donde brevemente podría seguir mostrando esta vista con el dato correcto.

```ts
@Post('documentos')
@UseInterceptors(FileInterceptor('archivo', multerOptionsDocumentos()))
async subirDocumento(
  @UsuarioActual() actual: UsuarioAutenticado,
  @Body() dto: SubirDocumentoDto,
  @UploadedFile() archivo?: Express.Multer.File,
): Promise<DocumentoListado> {
  if (!archivo) {
    throw new BadRequestException('Selecciona un archivo (PDF, JPG o PNG, máx. 5 MB).');
  }
  const doc = await this.documentos.crear({
    userId: actual.id,
    tipo: dto.tipo,
    nombreOriginal: archivo.originalname,
    mimeType: archivo.mimetype,
    rutaArchivo: archivo.path,
  });
  return mapearDocumento(doc);
}
```
`multerOptionsDocumentos()` (de `documentos/storage.ts`) ya validó tipo (PDF/JPG/PNG) y tamaño (máx. 5 MB) **antes** de que el archivo llegue aquí; el chequeo `if (!archivo)` cubre el caso en que no se envió ningún archivo en absoluto. `dto.tipo` (`identificacion`, `comprobante_estudios` u `otro`) viene validado por `SubirDocumentoDto` con `@IsIn(TIPOS_DOCUMENTO)`.

## Conexión con el resto del sistema

- Depende de `UsersService`, `ProgramasService` y `DocumentosService`.
- Usa `multerOptionsDocumentos` (`documentos/storage.ts`) para la configuración de subida de archivos.
- `mapearDocumento` (de `documentos.service.ts`) asegura que la respuesta nunca incluya la ruta real en disco del archivo, solo metadatos seguros de exponer.
- El resultado de la revisión de estos documentos lo gestiona `DocumentosController` (rol administrativo), no este controlador.

## Cosas que no son obvias a primera vista

- La subida de documentos no bloquea ni valida el número de documentos ni evita duplicados del mismo `tipo`: un aspirante podría subir varias "identificaciones" distintas; el comité ve todas en `GET /documentos/usuario/:userId`.
- El id de la solicitud nunca se expone como ruta pública: `solicitud` siempre se calcula sobre el usuario autenticado (`actual.id`), nunca recibe un parámetro de id en la URL — así que no hay forma de que un aspirante consulte el estado de otro aspirante por este endpoint.
