# `backend/src/documentos/documentos.controller.ts`

**En una frase:** rutas administrativas para revisar documentos de admisión: listar los de un usuario (respetando ámbito de coordinador), aprobar/rechazar, y servir el archivo original para visualizarlo.

## Por qué existe

Separa la revisión administrativa (este controlador) de la subida hecha por el propio aspirante (`AspiranteController`), porque mezclar un `:id` de usuario con un `:id` de documento en la misma ruta habría sido confuso y propenso a errores de permisos. Es la mitad "comité de admisión" del flujo descrito en `docs/requerimientos.md §12`.

## Recorrido del código

```ts
@Get('usuario/:userId')
@Roles(Rol.Superadmin, Rol.AdminAcademico, Rol.Coordinador)
async listarDeUsuario(@UsuarioActual() actual: UsuarioAutenticado, @Param('userId') userId: string): Promise<DocumentoListado[]> {
  const objetivo = await this.users.findById(userId);
  await verificarAmbitoCoordinador(this.users, actual, objetivo?.programaInteresId ?? null);
  const docs = await this.documentos.listarPorUsuario(userId);
  return docs.map(mapearDocumento);
}
```
Antes de devolver los documentos de `userId`, se valida el ámbito del coordinador contra el programa de interés de *ese* usuario objetivo (no del coordinador) — así un coordinador con ámbito en "Ingeniería de Software" no puede ver los documentos de un aspirante de "Administración de Negocios" cambiando el `userId` en la URL.

```ts
@Get(':id/archivo')
@Roles(Rol.Superadmin, Rol.AdminAcademico, Rol.Coordinador)
async descargar(@UsuarioActual() actual: UsuarioAutenticado, @Param('id') id: string, @Res() res: Response): Promise<void> {
  const doc = await this.documentos.findById(id);
  if (!doc) {
    throw new NotFoundException('Documento no encontrado');
  }
  const objetivo = await this.users.findById(doc.userId);
  await verificarAmbitoCoordinador(this.users, actual, objetivo?.programaInteresId ?? null);
  res.setHeader('Content-Type', doc.mimeType);
  res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(doc.nombreOriginal)}"`);
  createReadStream(doc.rutaArchivo).pipe(res);
}
```
- Mismo chequeo de ámbito que en `listarDeUsuario`, pero aquí se parte del documento (`doc.userId`) hacia el usuario dueño, porque el parámetro de la ruta es el id del documento, no del usuario.
- `Content-Disposition: inline` hace que el navegador muestre el PDF/imagen directamente en vez de forzar una descarga — es justamente el caso que obliga a la Content-Security-Policy restrictiva de `app.setup.ts`: este es el único punto donde el backend sirve contenido binario que no es JSON.
- El archivo se transmite con `createReadStream(...).pipe(res)` (streaming), no se carga completo en memoria antes de enviarlo — importante para no agotar memoria con archivos de varios megabytes.
- La ruta real en disco (`doc.rutaArchivo`) nunca sale de este método: no se devuelve en el JSON de ningún otro endpoint (ver `mapearDocumento`).

## Conexión con el resto del sistema

- Depende de `DocumentosService`, `UsersService` y la función compartida `verificarAmbitoCoordinador`.
- Protegido con `JwtAuthGuard` + `RolesGuard` en todo el controlador.
- Complementa a `AspiranteController` (que sube los documentos que este controlador revisa).

## Cosas que no son obvias a primera vista

- `revisar` (cambiar estado a aprobado/rechazado) está restringido solo a `Superadmin`/`AdminAcademico` — un coordinador puede *ver* documentos dentro de su ámbito, pero no puede aprobarlos ni rechazarlos.
- La validación de ámbito se repite a propósito en dos rutas distintas (`listarDeUsuario` y `descargar`) en vez de hacerse una sola vez en un guard genérico, porque cada una necesita llegar al `programaInteresId` del usuario objetivo por un camino distinto (directo vs. a través del documento). Por eso existe `verificarAmbitoCoordinador` como función compartida: para que ambos caminos terminen aplicando exactamente la misma regla.
