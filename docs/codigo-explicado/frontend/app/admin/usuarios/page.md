# `frontend/app/admin/usuarios/page.tsx`

**En una frase:** el panel administrativo más grande del portal: lista todos los usuarios, permite cambiar su rol, asignarles el ámbito de coordinación, matricularlos en un curso de Moodle, revisar sus documentos de admisión y enviarles notificaciones push.

## Por qué existe
Es la herramienta operativa principal de superadmin, admin_academico y coordinador para administrar a las personas dentro de la plataforma: desde admitir a un aspirante (cambiarle el rol y matricularlo en Moodle) hasta avisarle algo puntual por notificación push en la app Android.

## Recorrido del código

### Tres niveles de permiso distintos en una sola pantalla
```tsx
const ROLES_CON_ACCESO: Rol[] = ["superadmin", "admin_academico", "coordinador"];
const ROLES_QUE_PUEDEN_CAMBIAR_ROL: Rol[] = ["superadmin", "admin_academico"];
const ROLES_QUE_PUEDEN_NOTIFICAR: Rol[] = ["superadmin", "admin_academico", "coordinador", "profesor"];
```
No es un simple "puede ver / no puede ver": hay quién puede entrar (`ROLES_CON_ACCESO`), quién puede además cambiar roles y matricular (`ROLES_QUE_PUEDEN_CAMBIAR_ROL`), y quién puede notificar (`ROLES_QUE_PUEDEN_NOTIFICAR`, que incluye a profesor aunque este ni siquiera tiene acceso a la pantalla completa — ver el bloque "Mis estudiantes" en `/mi-iinicia` para su propio camino a notificar). Cada acción de la tabla (botones "Ámbito", "Documentos", "Matricular", "Notificar") se muestra u oculta según cuál de estas listas aplica, como en:
```tsx
{puedeEditar && usuario.rol === "coordinador" && (
  <Button onClick={() => alternarPanelAmbito(usuario)}>...</Button>
)}
```

### Paneles expandibles como filas extra de la tabla
Documentos, ámbito, matrícula y notificación no abren modales: cada uno es una fila adicional (`<tr>` con `colSpan={8}`) que aparece justo debajo de la fila del usuario cuando se activa, y usa un estado tipo "¿qué id está expandido ahora?" (`documentosId`, `ambitoId`, `matriculandoId`, `notificandoId`). Solo puede haber un panel de cada tipo abierto a la vez (abrir uno con el mismo id que ya estaba abierto lo cierra):
```tsx
function alternarPanelDocumentos(usuario: UsuarioListado) {
  if (documentosId === usuario.id) {
    setDocumentosId(null);
    return;
  }
  setDocumentosId(usuario.id);
  setDocumentos(null);
  setErrorDocumentos(null);
  if (!sesion) return;
  setCargandoDocumentos(true);
  obtenerDocumentosDeUsuario(sesion.token, usuario.id)
    .then(setDocumentos)
    .catch((err) => setErrorDocumentos(err instanceof ApiError ? err.message : "No se pudieron cargar los documentos."))
    .finally(() => setCargandoDocumentos(false));
}
```
Los documentos de ese aspirante se piden justo al abrir el panel, no antes: evita pedir documentos de todos los aspirantes de la lista cuando lo normal es revisar uno a la vez.

### Revisar documentos de admisión: ver, aprobar, rechazar
```tsx
async function handleAbrirDocumento(doc: DocumentoListado) {
  if (!sesion) return;
  try {
    await abrirDocumento(sesion.token, doc.id);
  } catch (err) {
    setErrorDocumentos(err instanceof ApiError ? err.message : "No se pudo abrir el documento.");
  }
}
```
`abrirDocumento` no es un simple `<a href>`: el archivo del documento requiere el encabezado `Authorization` con el JWT para poder descargarse (ver `frontend/lib/api.ts`), así que se pide con `fetch`, se convierte la respuesta en un blob y se abre en una pestaña nueva con `URL.createObjectURL`. Un enlace directo no podría llevar ese encabezado.

```tsx
async function handleRevisarDocumento(doc: DocumentoListado, estado: "aprobado" | "rechazado") {
  if (!sesion) return;
  setRevisandoId(doc.id);
  try {
    const actualizado = await revisarDocumento(sesion.token, doc.id, estado);
    setDocumentos((prev) => prev?.map((d) => (d.id === doc.id ? actualizado : d)) ?? prev);
  } catch (err) {
    setErrorDocumentos(err instanceof ApiError ? err.message : "No se pudo revisar el documento.");
  } finally {
    setRevisandoId(null);
  }
}
```
Los botones "Aprobar"/"Rechazar" solo aparecen si `puedeEditar` (superadmin/admin_academico) y si el documento no está ya en ese estado (`doc.estado !== "aprobado"` / `!== "rechazado"`), para no mostrar un botón que no cambiaría nada.

### Ámbito de un coordinador: qué programa puede ver
```tsx
async function handleGuardarAmbito(usuario: UsuarioListado) {
  if (!sesion) return;
  setGuardandoAmbito(true);
  try {
    const actualizado = await asignarProgramaCoordinado(sesion.token, usuario.id, programaAmbito || null);
    setUsuarios((prev) => prev?.map((u) => (u.id === usuario.id ? { ...u, programaCoordinadoId: actualizado.programaCoordinadoId, programaCoordinadoNombre: actualizado.programaCoordinadoNombre } : u)) ?? prev);
    setResultadoAmbito((prev) => ({
      ...prev,
      [usuario.id]: actualizado.programaCoordinadoNombre ? `Ámbito: ${actualizado.programaCoordinadoNombre}.` : "Sin ámbito: vuelve a ver todos los usuarios.",
    }));
  } catch (err) { ... }
}
```
Solo tiene sentido para usuarios con `rol === "coordinador"`. Si `programaAmbito` queda vacío, se manda `null`: eso le dice al backend que ese coordinador debe volver a ver **todos** los usuarios (sin filtrar por programa), no que su ámbito sea "ningún programa".

### Matricular a alguien en Moodle: selector en vivo con respaldo manual
```tsx
{cursosMoodle ? (
  <Select ... >
    <option value="">Selecciona un curso…</option>
    {cursosMoodle.map((curso) => (
      <option key={curso.id} value={curso.shortname}>{curso.fullname}</option>
    ))}
  </Select>
) : (
  <Input
    hint={errorCursos ?? "Cargando catálogo de Moodle…"}
    placeholder="Ej. IINICIA101-SOFTWARE"
    ...
  />
)}
```
Mientras el catálogo real de cursos de Moodle (`obtenerCursosMoodle`) no ha llegado (o falló), el campo cae a un `<Input>` de texto libre donde el admin puede escribir el shortname a mano, con el error o el mensaje de "cargando" como pista (`hint`). En cuanto el catálogo llega, se reemplaza por un `<Select>` con los nombres reales, para evitar errores de dedo al escribir un shortname.

```tsx
async function handleAsignarCurso(usuario: UsuarioListado) {
  ...
  const actualizado = await asignarCursoUsuario(sesion.token, usuario.id, cursoShortname.trim());
  setUsuarios((prev) => prev?.map((u) => (u.id === usuario.id ? { ...u, moodleUserId: actualizado.moodleUserId } : u)) ?? prev);
  ...
}
```
`asignarCursoUsuario` (que llama a `POST /usuarios/:id/matricula`) vincula la cuenta de Moodle del usuario si todavía no existe y lo matricula en ese curso; es idempotente y se puede repetir para matricular en más cursos sin romper nada (ver el comentario en `frontend/lib/api.ts`).

### Notificaciones push
```tsx
async function handleEnviarNotificacion(usuario: UsuarioListado) {
  ...
  await enviarNotificacion(sesion.token, usuario.id, {
    titulo: formNotif.titulo.trim(),
    mensaje: formNotif.mensaje.trim(),
    cursoId: formNotif.cursoId.trim() || undefined,
  });
  ...
}
```
`cursoId` es opcional: si se da, la app Android abrirá directo ese curso al tocar la notificación; si no, solo muestra el aviso. El backend responde con error si ese usuario no tiene ningún dispositivo Android registrado (no se puede mandar un push a nadie).

## Conexión con el resto del sistema
- Llama (todas en `frontend/lib/api.ts`) a: `obtenerUsuarios`, `actualizarRolUsuario`, `asignarProgramaCoordinado`, `obtenerDocumentosDeUsuario`, `abrirDocumento`, `revisarDocumento`, `asignarCursoUsuario`, `obtenerCursosMoodle`, `obtenerProgramas`, `enviarNotificacion`.
- Usa `Badge`, `Button`, `Card`, `Input`, `Select`, `Reveal`, `SectionBg` de `frontend/components/ui/`.
- `/mi-iinicia` (`DashboardResumen`) enlaza aquí para administrar o consultar usuarios.
- `SiteHeader` muestra el enlace "Usuarios" a los mismos roles que pueden entrar (`ROLES_CON_PANEL_ADMIN`).

## Cosas que no son obvias a primera vista
- El rol `coordinador` puede entrar y notificar, pero no puede cambiar roles ni matricular a nadie (`puedeEditar` es `false` para él); solo ve la columna de rol como una insignia de solo lectura, no como un selector.
- `abrirDocumento` usa `fetch` + blob en vez de un enlace directo precisamente porque el archivo exige el token `Authorization`, que un `<a href>` no puede enviar.
- Asignar "sin ámbito" a un coordinador (`programaAmbito` vacío → `null`) significa que vuelve a ver a todos los usuarios, no que no vea a ninguno.
