# `backend/src/materias/materias.controller.ts`

**En una frase:** rutas CRUD del catálogo de materias por carrera, usadas únicamente desde el panel de administración.

## Por qué existe

Expone, vía HTTP, las operaciones de `MateriasService` para que el panel `/admin/materias` del portal pueda crear y mantener la seriación de cada carrera. No contiene lógica propia: cada método delega directamente al servicio.

## Recorrido del código

```ts
@Controller('materias')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Rol.Superadmin, Rol.AdminAcademico)
export class MateriasController {
  constructor(private readonly materias: MateriasService) {}

  @Get()
  listar(@Query('programaId') programaId?: string): Promise<Materia[]> {
    return this.materias.listar(programaId);
  }

  @Post()
  crear(@Body() dto: CrearMateriaDto): Promise<Materia> {
    return this.materias.crear(dto);
  }

  @Patch(':id')
  actualizar(@Param('id') id: string, @Body() dto: ActualizarMateriaDto): Promise<Materia> {
    return this.materias.actualizar(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  eliminar(@Param('id') id: string): Promise<void> {
    return this.materias.eliminar(id);
  }
}
```
Todo el controlador (no solo rutas individuales) está restringido a `Superadmin`/`AdminAcademico`: el comentario del código es explícito en que "el aspirante/estudiante nunca lo elige directamente" — la seriación es un dato administrativo, no algo que el usuario final edite o seleccione.

`@HttpCode(204)` en `eliminar` sigue la convención HTTP de que un `DELETE` exitoso sin contenido que devolver responde "204 No Content", en vez del 200 por defecto de Nest para otros verbos.

Qué validan los DTOs al vuelo: `CrearMateriaDto` exige `id`, `programaId`, `nombre` y `moodleCourseShortname` (todos strings no vacíos, con límites de longitud), y un arreglo opcional de `prerequisitos` (strings). `ActualizarMateriaDto` es la misma forma pero con todo opcional, y deliberadamente **no** incluye `id` ni `programaId`: no se permite reasignar una materia existente a otra carrera ni cambiarle el id una vez creada.

## Conexión con el resto del sistema

- Delega toda la lógica a `MateriasService`.
- Protegido por `JwtAuthGuard` + `RolesGuard` con `@Roles(Superadmin, AdminAcademico)`.
- Lo consume el panel `/admin/materias` del portal.

## Cosas que no son obvias a primera vista

- No hay ninguna ruta pública de materias: a diferencia de `ProgramasController` (donde `GET /programas` es público para que el home y el registro de aspirantes lo consulten sin sesión), aquí **toda** la lectura también requiere sesión y rol administrativo — las materias son un detalle interno de seriación, no parte del catálogo que se le muestra a un visitante.
- `ActualizarMateriaDto` no permitir cambiar `programaId` es una decisión deliberada: mover una materia de carrera podría dejar sus prerequisitos (que están validados contra la carrera original) en un estado inconsistente.
