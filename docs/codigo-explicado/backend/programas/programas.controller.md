# `backend/src/programas/programas.controller.ts`

**En una frase:** expone el catálogo de oferta académica: lectura pública (sin sesión) y escritura restringida a roles administrativos.

## Por qué existe

El catálogo de programas tiene dos públicos muy distintos: cualquier visitante del home del portal necesita verlo sin haber iniciado sesión (para elegir un programa antes incluso de registrarse), mientras que crearlo o editarlo es una tarea exclusivamente administrativa. Este controlador refleja esa asimetría directamente en cómo protege cada ruta.

## Recorrido del código

```ts
@Controller('programas')
export class ProgramasController {
  constructor(private readonly programas: ProgramasService) {}

  @Get()
  listar(): Promise<Programa[]> {
    return this.programas.listar();
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.Superadmin, Rol.AdminAcademico)
  crear(@Body() dto: CrearProgramaDto): Promise<Programa> {
    return this.programas.crear(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Rol.Superadmin, Rol.AdminAcademico)
  actualizar(@Param('id') id: string, @Body() dto: ActualizarProgramaDto): Promise<Programa> {
    return this.programas.actualizar(id, dto);
  }
}
```
Nótese que `@Controller('programas')` **no** tiene `@UseGuards(...)` a nivel de clase (al contrario de `MateriasController` o `AspiranteController`): los guards se aplican individualmente solo en `crear` y `actualizar`. `listar` queda deliberadamente sin ningún guard, porque el comentario del código es explícito: "la lectura es pública (home y registro de aspirantes la necesitan sin sesión)".

## Conexión con el resto del sistema

- Delega toda la lógica a `ProgramasService`.
- Lo consume el home del portal (catálogo de oferta académica) y el formulario de registro de aspirantes (selector de `programaInteresId`), ambos sin sesión iniciada.
- El panel administrativo usa `crear`/`actualizar` para mantener el catálogo y asignar el `moodleCourseShortname` de cada programa.

## Cosas que no son obvias a primera vista

- Que `GET /programas` sea pública es intencional y necesaria para el flujo de negocio, no un descuido de seguridad: no hay datos sensibles en el catálogo (nombre, descripción, duración, modalidad), así que exponerlo sin sesión es seguro y es justo lo que requiere la experiencia de registro.
- No hay ruta de borrado (`DELETE`) para programas: solo crear y actualizar. Borrar un programa que ya tiene usuarios con ese `programaInteresId`, o materias asociadas, dejaría referencias huérfanas; esa decisión de diseño evita ese problema por el momento simplemente no ofreciendo la operación.
