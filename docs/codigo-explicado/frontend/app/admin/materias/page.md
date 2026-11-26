# `frontend/app/admin/materias/page.tsx`

**En una frase:** panel donde superadmin/admin_academico administran las materias de cada carrera y definen su seriación (qué materia necesita tener aprobadas otras antes).

## Por qué existe
IINICIA necesita bloquear que un estudiante se matricule en una materia avanzada antes de aprobar sus prerequisitos. Esta pantalla es donde se define esa seriación por carrera: cada materia corresponde a un curso de Moodle (`moodleCourseShortname`) y puede tener una lista de otras materias como prerequisito.

## Recorrido del código

### Protección de ruta por rol
```tsx
const ROLES_CON_ACCESO: Rol[] = ["superadmin", "admin_academico"];
...
useEffect(() => {
  if (cargando) return;
  if (!sesion || !ROLES_CON_ACCESO.includes(sesion.usuario.rol)) {
    router.replace(sesion ? "/mi-iinicia" : "/login");
  }
}, [cargando, sesion, router]);

const tieneAcceso = !!sesion && ROLES_CON_ACCESO.includes(sesion.usuario.rol);
```
Solo superadmin y admin_academico pueden ver esta pantalla (a diferencia de `/admin/programas` o `/admin/usuarios`, aquí ni siquiera el coordinador tiene acceso). Si no hay sesión, manda a `/login`; si hay sesión pero el rol no alcanza, manda a `/mi-iinicia`. Esta redirección es solo de interfaz: si alguien llamara directo a los endpoints de materias sin el rol correcto, el backend los rechazaría igual.

### Cargar materias según la carrera seleccionada
```tsx
function cargarMaterias() {
  if (!sesion || !programaId) return;
  setCargandoMaterias(true);
  obtenerMaterias(sesion.token, programaId)
    .then((data) => setMaterias(data))
    .catch((err) => setError(err instanceof ApiError ? err.message : "No se pudo cargar las materias."))
    .finally(() => setCargandoMaterias(false));
}

useEffect(() => {
  cargarMaterias();
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [sesion, programaId]);
```
Cada vez que cambia la carrera elegida en el selector (`programaId`), se vuelve a pedir la lista de materias de esa carrera específica. El `eslint-disable` existe porque `cargarMaterias` se recrea en cada render (no es una función memoizada) pero el efecto solo necesita re-ejecutarse cuando cambian `sesion` o `programaId`, no cuando cambia la referencia de la función.

### Prerequisitos como un conjunto de checkboxes
```tsx
function togglePrerequisito(id: string) {
  setForm((prev) => ({
    ...prev,
    prerequisitos: prev.prerequisitos.includes(id)
      ? prev.prerequisitos.filter((p) => p !== id)
      : [...prev.prerequisitos, id],
  }));
}
```
Tanto en el formulario de "Nueva materia" como en la edición de una existente, los prerequisitos se eligen con checkboxes (una materia por cada otra materia ya existente en esa carrera, excluyéndose a sí misma). Este patrón agrega o quita el id de la lista según si ya estaba marcado.

### Edición inline en la misma tabla
```tsx
function abrirEdicion(materia: Materia) {
  setEditandoId(materia.id);
  setErrorEdicion(null);
  setEdicion({
    nombre: materia.nombre,
    moodleCourseShortname: materia.moodleCourseShortname,
    prerequisitos: materia.prerequisitos,
  });
}
```
Al hacer clic en "Editar" sobre una fila, no se abre un modal ni otra página: se inserta una fila extra debajo (`<tr>` con `colSpan={4}`) con los campos editables, precargados con los valores actuales de esa materia. "Cancelar" simplemente cierra esa fila sin guardar nada (`setEditandoId(null)`).

### Borrado con confirmación y con una regla de negocio visible en el error
```tsx
async function borrarMateria(materia: Materia) {
  if (!sesion) return;
  if (!window.confirm(`¿Borrar "${materia.nombre}"? Esta acción no se puede deshacer.`)) return;
  setError(null);
  setBorrandoId(materia.id);
  try {
    await eliminarMateria(sesion.token, materia.id);
    setMaterias((prev) => prev?.filter((m) => m.id !== materia.id) ?? prev);
    if (editandoId === materia.id) setEditandoId(null);
  } catch (err) {
    setError(err instanceof ApiError ? err.message : "No se pudo borrar la materia.");
  } finally {
    setBorrandoId(null);
  }
}
```
`window.confirm` es el único lugar del portal que usa el diálogo nativo del navegador en vez de un modal propio, porque es una acción destructiva poco frecuente y no justifica construir un componente de confirmación aparte. Si el backend rechaza el borrado (ver `frontend/lib/api.ts`: pasa con código 400 si otra materia todavía la usa como prerequisito, para no dejar un prerequisito fantasma), el mensaje de error de esa regla se muestra tal cual viene del backend.

## Conexión con el resto del sistema
- Llama a `obtenerProgramas`, `obtenerMaterias`, `crearMateria`, `actualizarMateria`, `eliminarMateria` (todas en `frontend/lib/api.ts`), que a su vez llaman a `GET /programas`, `GET /materias`, `POST /materias`, `PATCH /materias/:id`, `DELETE /materias/:id`.
- Usa `Button`, `Card`, `Input`, `Select`, `Reveal`, `SectionBg` de `frontend/components/ui/`.
- `SiteHeader` muestra el enlace a esta página solo para `superadmin`/`admin_academico` (`ROLES_CON_PANEL_MATERIAS`).
- La seriación que aquí se define es lo que el backend usa para bloquear matrículas desde `/admin/usuarios` (ver ese doc).

## Cosas que no son obvias a primera vista
- El bloqueo por prerequisitos solo aplica a quien eligió esa carrera como programa de interés; un curso "suelto" matriculado fuera de ese contexto nunca se bloquea (explicado en el propio texto de la página al usuario).
- El rol `coordinador` no tiene acceso a esta pantalla, a diferencia de `/admin/programas` donde sí la ve en modo de solo lectura.
- El id de una materia nueva (`form.id`) es un slug que el usuario escribe a mano y no puede cambiarse después de crearla (no aparece en el formulario de edición).
