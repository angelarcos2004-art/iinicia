# `frontend/app/admin/programas/page.tsx`

**En una frase:** panel que administra el catálogo de programas académicos (licenciaturas, diplomados, certificaciones) y qué curso de Moodle le corresponde a cada uno.

## Por qué existe
Cuando se admite a un aspirante, el sistema necesita saber a qué curso real de Moodle matricularlo según el programa que eligió. Esta pantalla es donde se mantiene esa relación programa ↔ curso de Moodle, además de los datos generales del programa (nombre, tipo, modalidad, duración, descripción) que también alimentan el catálogo público de la home y de `/registro`.

## Recorrido del código

### Dos niveles de acceso en la misma pantalla
```tsx
const ROLES_CON_ACCESO: Rol[] = ["superadmin", "admin_academico", "coordinador"];
const ROLES_QUE_PUEDEN_EDITAR: Rol[] = ["superadmin", "admin_academico"];
...
const puedeEditar = ROLES_QUE_PUEDEN_EDITAR.includes(sesion.usuario.rol);
```
A diferencia de `/admin/materias` (acceso total o nada), aquí hay un nivel intermedio: coordinador puede **ver** esta pantalla, pero no editar nada en ella. `puedeEditar` decide si se muestran los campos editables (input de Moodle, botón "Guardar", formulario de "Nuevo programa") o solo texto de solo lectura y la columna de acciones desaparece de la tabla.

### Edición de "curso de Moodle" como borrador local hasta guardar
```tsx
const [cursoEditado, setCursoEditado] = useState<Record<string, string>>({});
...
<input
  value={cursoEditado[programa.id] ?? programa.moodleCourseShortname ?? ""}
  onChange={(e) => setCursoEditado((prev) => ({ ...prev, [programa.id]: e.target.value }))}
  ...
/>
```
En vez de actualizar el programa en cada tecla, el valor que el usuario escribe se guarda aparte, en un diccionario `cursoEditado` indexado por el id del programa. Mientras no se presiona "Guardar", lo que se muestra es ese borrador si existe, o el valor real guardado (`programa.moodleCourseShortname`) si no se ha tocado. Esto permite editar varias filas a la vez sin pisarse entre sí y sin mandar una petición al backend por cada letra escrita.

```tsx
async function guardarCurso(programa: Programa) {
  if (!sesion) return;
  const nuevoCurso = (cursoEditado[programa.id] ?? "").trim();
  setError(null);
  setGuardandoId(programa.id);
  try {
    const actualizado = await actualizarPrograma(sesion.token, programa.id, {
      moodleCourseShortname: nuevoCurso || null,
    });
    setProgramas((prev) => prev?.map((p) => (p.id === programa.id ? actualizado : p)) ?? prev);
  } catch (err) {
    setError(err instanceof ApiError ? err.message : "No se pudo guardar el curso de Moodle.");
  } finally {
    setGuardandoId(null);
  }
}
```
Si el campo queda vacío, se manda `null` explícitamente (no una cadena vacía), para que el backend lo interprete como "este programa todavía no tiene curso de Moodle asignado" en vez de un shortname inválido.

### Crear un programa nuevo
```tsx
async function handleCrear(event: FormEvent<HTMLFormElement>) {
  event.preventDefault();
  if (!sesion) return;
  setErrorForm(null);
  if (!form.id.trim() || !form.nombre.trim() || !form.duracion.trim() || !form.descripcion.trim()) {
    setErrorForm("Completa todos los campos.");
    return;
  }
  setCreando(true);
  try {
    const creado = await crearPrograma(sesion.token, form.id.trim(), {
      nombre: form.nombre.trim(),
      tipo: form.tipo,
      modalidad: form.modalidad,
      duracion: form.duracion.trim(),
      descripcion: form.descripcion.trim(),
      moodleCourseShortname: null,
    });
    setProgramas((prev) => [...(prev ?? []), creado]);
    setForm(FORM_INICIAL);
  } catch (err) {
    setErrorForm(err instanceof ApiError ? err.message : "No se pudo crear el programa.");
  } finally {
    setCreando(false);
  }
}
```
Un programa nuevo siempre nace sin curso de Moodle asignado (`moodleCourseShortname: null`): el admin lo asigna después, desde la tabla, una vez que ese curso ya exista en Moodle.

## Conexión con el resto del sistema
- Llama a `obtenerProgramas`, `crearPrograma`, `actualizarPrograma` (`frontend/lib/api.ts` → `GET/POST/PATCH /programas`).
- Usa `Button`, `Card`, `Input`, `Select`, `Reveal`, `SectionBg` de `frontend/components/ui/`.
- El catálogo que aquí se administra es el mismo que consumen `frontend/app/page.tsx` (home) y `frontend/app/registro/page.tsx` (selector de programa de interés).
- `/admin/materias` depende de este mismo catálogo de programas para filtrar materias por carrera.

## Cosas que no son obvias a primera vista
- El coordinador puede ver esta pantalla completa (a diferencia de `/admin/materias`, donde no tiene acceso), pero no puede cambiar nada: es solo lectura para ese rol.
- El id de un programa nuevo se escribe a mano como slug (`form.id`) y no aparece en ningún formulario de edición; una vez creado no cambia.
- Guardar el curso de Moodle de un programa es una acción explícita por fila (botón "Guardar"), no se guarda automáticamente al perder el foco del campo.
