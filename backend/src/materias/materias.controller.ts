import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { Rol } from '../users/rol.enum.js';
import { ActualizarMateriaDto } from './dto/actualizar-materia.dto.js';
import { CrearMateriaDto } from './dto/crear-materia.dto.js';
import { Materia } from './materia.entity.js';
import { MateriasService } from './materias.service.js';

/**
 * Catálogo de materias por carrera (seriación): solo lo administra el admin académico desde
 * el panel, el aspirante/estudiante nunca lo elige directamente.
 */
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
