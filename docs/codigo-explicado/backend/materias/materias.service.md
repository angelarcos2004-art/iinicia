# `backend/src/materias/materias.service.ts`

**En una frase:** gestiona el catálogo de materias por carrera (CRUD) y es quien decide, antes de una matrícula, si al estudiante le falta aprobar algún prerequisito.

## Por qué existe

La seriación de materias (bloquear el avance hasta aprobar ciertos cursos) es un requisito académico real, pero Moodle por sí solo no sabe nada de "carreras" ni de "prerequisitos" tal como los modela IINICIA — solo sabe de cursos individuales y su progreso. Este servicio es el que traduce esa regla de negocio (seriación) a una decisión concreta: permitir o bloquear una matrícula.

## Recorrido del código

### Validación de prerequisitos al crear/editar una materia

```ts
private async validarPrerequisitos(id: string, programaId: string, prerequisitos: string[]): Promise<void> {
  if (prerequisitos.includes(id)) {
    throw new BadRequestException('Una materia no puede ser prerequisito de sí misma');
  }
  if (prerequisitos.length === 0) return;
  const existentes = await this.repo.find({ where: { id: In(prerequisitos), programaId } });
  if (existentes.length !== new Set(prerequisitos).size) {
    throw new BadRequestException('Algún prerequisito no existe en esta carrera');
  }
}
```
Dos reglas simples pero importantes: una materia no puede depender de sí misma, y todo prerequisito declarado debe existir **en la misma carrera** (`programaId`) — evita que alguien, por error, enlace una materia de "Ingeniería de Software" como prerequisito de una materia de "Administración de Negocios", lo cual no tendría sentido en la seriación.

### Borrado protegido

```ts
async eliminar(id: string): Promise<void> {
  const materia = await this.findById(id);
  if (!materia) { throw new NotFoundException('Materia no encontrada'); }
  const delPrograma = await this.repo.find({ where: { programaId: materia.programaId } });
  const dependientes = delPrograma.filter((m) => m.prerequisitos.includes(id));
  if (dependientes.length > 0) {
    throw new BadRequestException(`No puedes borrar "${materia.nombre}": es prerequisito de ${dependientes.map((d) => d.nombre).join(', ')}`);
  }
  await this.repo.delete(id);
}
```
No se puede borrar una materia si otra la tiene como prerequisito. El comentario del código explica la razón real, no solo "porque sí": si se permitiera, la materia dependiente quedaría con un prerequisito "fantasma" (un id que ya no existe), y `verificarPrerequisitos` simplemente lo ignoraría al no encontrarlo — dejando pasar a cualquier estudiante sin haber aprobado nunca ese requisito. El bloqueo al borrar es lo que mantiene la integridad de la seriación.

### La decisión real: `verificarPrerequisitos`

```ts
async verificarPrerequisitos(user: User, courseShortname: string): Promise<void> {
  if (!user.programaInteresId) return;
  const materia = await this.repo.findOne({ where: { programaId: user.programaInteresId, moodleCourseShortname: courseShortname } });
  if (!materia || materia.prerequisitos.length === 0) return;
  const prerequisitos = await this.repo.find({ where: { id: In(materia.prerequisitos) } });
  const aprobadas = user.moodleUserId ? await this.moodle.obtenerCursosAprobados(user.moodleUserId) : new Set<string>();
  const faltantes = prerequisitos.filter((p) => !aprobadas.has(p.moodleCourseShortname));
  if (faltantes.length > 0) {
    throw new BadRequestException(`No puedes matricularte en "${materia.nombre}": falta aprobar ${faltantes.map((f) => f.nombre).join(', ')}`);
  }
}
```
Esta función tiene varias salidas tempranas ("no bloquear") deliberadas:
- Sin `programaInteresId` (el usuario nunca eligió una carrera), no hay seriación que aplicar.
- Si el curso de Moodle (`courseShortname`) no corresponde a ninguna materia registrada para esa carrera, se trata como un "curso suelto" sin seriación — el comportamiento de matrícula sigue siendo el de siempre, sin bloqueo.
- Si la materia encontrada no tiene prerequisitos, tampoco hay nada que validar.

Solo cuando sí hay una materia con prerequisitos reales se consulta a Moodle (`obtenerCursosAprobados`) cuáles cursos tiene completados al 100% el estudiante, y se compara contra los `moodleCourseShortname` de cada prerequisito. Si falta alguno, se lanza un error explicando exactamente qué materias faltan por nombre (no solo un "no autorizado" genérico), para que el administrador que intenta matricular entienda la razón.

## Conexión con el resto del sistema

- Lo usa `MateriasController` (CRUD administrativo) y `UsuariosController.asignarCurso` (antes de matricular manualmente a un usuario en un curso).
- Depende de `MoodleService.obtenerCursosAprobados` para saber qué está "aprobado" de verdad (ver `moodle.service.md`: el criterio es progreso al 100%, Moodle no distingue "reprobado" de "en curso" sin una calificación configurada).
- Opera sobre la entidad `Materia` (`materia.entity.ts`).

## Cosas que no son obvias a primera vista

- `verificarPrerequisitos` solo se llama desde `asignarCurso` (matrícula manual elegida por un administrador), **no** desde `actualizarRol` (la promoción automática de aspirante a estudiante, que matricula en el curso de inducción del programa). Esto es intencional: el primer curso de una carrera no debería tener prerequisitos de todos modos, así que la verificación solo importa en matrículas posteriores.
- "Aprobado" para la seriación significa, literalmente, `progress === 100` en Moodle — no una calificación mínima aprobatoria configurada en el curso. Un curso sin seguimiento de finalización activado en Moodle nunca podrá marcarse como aprobado para efectos de seriación.
