# `backend/src/auth/ambito-coordinador.ts`

**En una frase:** función compartida que, si el usuario actual es coordinador con un programa asignado, revisa que el recurso que está consultando pertenezca a ese mismo programa; de lo contrario lanza 403.

## Por qué existe

El rol coordinador tiene "acceso limitado al programa o unidad asignada" (`docs/requerimientos.md §11`), a diferencia de superadmin/admin_académico, que ven todo. Esta regla se necesitaba en más de un controlador (`UsuariosController` y `DocumentosController`), y escribirla dos veces habría significado el riesgo real de que una ruta nueva la olvidara — que es justo lo que encontró la auditoría de seguridad del proyecto en su momento. Por eso se extrajo a una sola función que ambos controladores llaman.

## Recorrido del código

```ts
export async function verificarAmbitoCoordinador(
  users: Pick<UsersService, 'findById'>,
  actual: UsuarioAutenticado,
  programaInteresIdObjetivo: string | null,
): Promise<void> {
  if (actual.rol !== Rol.Coordinador) return;
  const coordinador = await users.findById(actual.id);
  const ambito = coordinador?.programaCoordinadoId ?? null;
  if (ambito && programaInteresIdObjetivo !== ambito) {
    throw new ForbiddenException('Fuera del ámbito asignado');
  }
}
```
- Si `actual.rol` no es coordinador, la función no hace nada: el chequeo de ámbito solo aplica a ese rol. Para cualquier otro rol (incluido profesor, que tiene su propia restricción distinta basada en cursos de Moodle, ver `usuarios.controller.md`), esta función es un no-op.
- `coordinador?.programaCoordinadoId` se vuelve a consultar en la base de datos en cada llamada (no se confía en nada que venga del JWT): el ámbito puede cambiar en cualquier momento (ver `UsuariosController.asignarProgramaCoordinado`), así que siempre se lee el valor actual.
- Si el coordinador **no tiene** ámbito asignado todavía (`ambito` es `null`), la función no restringe nada: ve todo, igual que `GET /usuarios` sin filtro. El ámbito es opt-in: un coordinador recién creado no está limitado hasta que un admin le asigna un programa.
- `programaInteresIdObjetivo` es el programa del *recurso* que se está consultando (el programa de interés del usuario objetivo, o el programa del dueño de un documento) — se compara contra el ámbito del coordinador, no al revés.
- Recibe `users: Pick<UsersService, 'findById'>` en vez del tipo completo `UsersService`: es la porción mínima de esa clase que esta función necesita, lo cual también facilita escribir pruebas unitarias con un doble de prueba (mock) más pequeño.

## Conexión con el resto del sistema

- La llaman `UsuariosController` (en `listar` para filtrar, y en `notificar` para restringir a quién puede notificar un coordinador) y `DocumentosController` (`listarDeUsuario` y `descargar`, para que un coordinador no pueda ver documentos de aspirantes fuera de su programa).
- Depende de `UsersService.findById` y del campo `programaCoordinadoId` en la entidad `User`.
- El ámbito se asigna/quita vía `UsuariosController.asignarProgramaCoordinado`.

## Cosas que no son obvias a primera vista

- Esta función lanza una excepción (`ForbiddenException`) en vez de devolver un booleano: el patrón de uso es "llamarla y dejar que decida si interrumpe la petición", no "preguntarle y decidir qué hacer con la respuesta". Esto hace que sea trivial de insertar en una ruta nueva: una sola línea `await verificarAmbitoCoordinador(...)` antes de continuar.
- No cubre al rol profesor: ese rol tiene una restricción de ámbito completamente distinta (basada en qué estudiantes comparten un curso real de Moodle con él, no en un campo de la base de datos), implementada directamente en `UsuariosController.estudiantesRealesDe`.
