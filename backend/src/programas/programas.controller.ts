import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { Rol } from '../users/rol.enum.js';
import { ActualizarProgramaDto } from './dto/actualizar-programa.dto.js';
import { CrearProgramaDto } from './dto/crear-programa.dto.js';
import { Programa } from './programa.entity.js';
import { ProgramasService } from './programas.service.js';

/**
 * Catálogo de oferta académica. La lectura es pública (home y registro de aspirantes la
 * necesitan sin sesión); crear/editar programas y su curso de Moodle asociado es
 * responsabilidad del administrador académico (docs/requerimientos.md CA-06).
 */
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
