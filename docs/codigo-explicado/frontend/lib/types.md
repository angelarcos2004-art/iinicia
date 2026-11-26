# `frontend/lib/types.ts`

**En una frase:** el "diccionario" de TypeScript: define la forma exacta de cada dato que viaja entre el frontend y el backend (usuarios, roles, programas, materias, cursos, documentos, etc.), para que el compilador avise si algo no coincide.

## Por qué existe
El proyecto usa TypeScript estricto (regla del CLAUDE.md del repo). Sin estos tipos, cada página tendría que adivinar qué campos trae un objeto que viene del backend, y un error de tipeo en un nombre de campo (`correo` vs `email`) solo se descubriría en producción. Con estos tipos, el editor y el compilador avisan de inmediato si, por ejemplo, se intenta leer `usuario.email` cuando el campo real se llama `usuario.correo`.

## Recorrido del código

### El tipo `Rol`, espejo exacto de las reglas del proyecto
```ts
/** Roles definidos en CLAUDE.md. El backend valida estos mismos roles. */
export type Rol =
  | "superadmin"
  | "admin_academico"
  | "coordinador"
  | "profesor"
  | "estudiante"
  | "aspirante";
```
Esta lista de 6 roles coincide exactamente con la sección "Roles" del `CLAUDE.md` raíz del proyecto. El comentario aclara que el backend valida estos mismos roles: este tipo es solo para que el frontend no se equivoque al construir o leer un rol, **no** es la fuente de la autorización real (esa vive en el backend).

### Separar "lo que se lee" de "lo que se puede editar"
```ts
export interface Programa {
  id: string;
  tipo: TipoPrograma;
  nombre: string;
  descripcion: string;
  duracion: string;
  modalidad: Modalidad;
  moodleCourseShortname: string | null;
}

/** Datos editables de un programa (todo excepto el id, que no cambia). */
export type ProgramaInput = Omit<Programa, "id">;
```
`ProgramaInput` se deriva de `Programa` quitándole el campo `id` (`Omit`), en vez de escribirse de cero. Así, si algún día se agrega un campo nuevo a `Programa`, `ProgramaInput` lo hereda automáticamente sin tener que acordarse de actualizarlo en dos lugares a mano. El patrón se repite con `UsuarioListado extends Usuario` (agrega los campos que solo tiene sentido ver en el panel administrativo, como `moodleUserId` o `createdAt`).

### Campos `null` que documentan un caso real, no un error
```ts
/** Curso de Moodle (shortname) al que se matricula a quien sea admitido en este programa.
 * Null = todavía no tiene uno asignado (panel admin /admin/programas). */
moodleCourseShortname: string | null;
```
```ts
/**
 * Curso real de Moodle (GET /estudiante/cursos), tal como lo devuelve el
 * backend. `progreso` es null cuando el curso no tiene seguimiento de
 * finalización activado en Moodle: no se inventa un valor.
 */
export interface CursoInscrito {
  id: number;
  nombre: string;
  shortname: string;
  progreso: number | null;
}
```
En ambos casos, `null` no significa "dato faltante por error": significa un estado real y esperado (un programa que aún no tiene curso asignado, o un curso de Moodle sin seguimiento de progreso activado). El código que consume estos tipos (como `frontend/app/mi-iinicia/page.tsx` → `estadoCurso()`) revisa explícitamente ese caso en vez de tratarlo como un dato roto.

### Tipos acotados a lo que cada pantalla necesita, no "el usuario completo"
```ts
/** Estudiante real de un curso del profesor (GET /usuarios/mis-estudiantes), para notificarlo. */
export interface EstudianteDeProfesor {
  id: string;
  nombre: string;
  correo: string;
  cursos: string[];
  tieneDispositivo: boolean;
}
```
Este tipo es deliberadamente más chico que `UsuarioListado`: el profesor no necesita (ni debería recibir) todos los campos administrativos de un usuario, solo lo necesario para mostrarlo y notificarlo. El backend devuelve exactamente esta forma reducida para ese endpoint.

## Conexión con el resto del sistema
Este archivo no llama a nada; es puramente de tipos (no genera código JavaScript en tiempo de ejecución, solo existe para el compilador). Lo importan:
- `frontend/lib/api.ts` (todas las firmas de las funciones que hablan con el backend).
- `frontend/lib/auth-context.tsx` (`Usuario`, `AuthResponse`, `LoginInput`, etc.).
- Todas las páginas que muestran datos del backend: `app/page.tsx`, `app/mi-iinicia/page.tsx`, `app/admin/*/page.tsx`, `app/registro/page.tsx`.
- `frontend/lib/mock-data.ts` (los datos de ejemplo están tipados con estos mismos tipos, para que nunca se desincronicen de la forma real).

## Cosas que no son obvias a primera vista
- Que un campo tenga el tipo `Rol` o `TipoPrograma` (en vez de `string`) no impide por sí solo que el backend reciba un valor inválido: es una ayuda del editor y del compilador para el código del frontend, la validación real de esos valores ocurre en el backend.
- `MateriaInput` es literalmente igual a `Materia` (`export type MateriaInput = Materia;`): a diferencia de `ProgramaInput`, aquí sí se necesita mandar el `id` y el `programaId` al crear una materia nueva, porque el id de una materia lo elige quien la crea (un slug escrito a mano), no lo genera el backend.
