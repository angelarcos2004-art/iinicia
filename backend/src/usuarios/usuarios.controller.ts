import { Body, Controller, Logger, NotFoundException, Param, Patch, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { vincularYMatricularMoodle } from '../moodle/moodle-onboarding.js';
import { MoodleService } from '../moodle/moodle.service.js';
import { Rol } from '../users/rol.enum.js';
import { UsersService } from '../users/users.service.js';
import { ActualizarRolDto } from './dto/actualizar-rol.dto.js';

export interface UsuarioActualizado {
  id: string;
  nombre: string;
  correo: string;
  rol: Rol;
}

/**
 * Administración de usuarios por roles privilegiados. Implementa el paso de
 * "admisión" de docs/requerimientos.md §12: un administrador académico
 * autoriza a un aspirante y el sistema lo vincula/matricula en Moodle.
 */
@Controller('usuarios')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsuariosController {
  private readonly logger = new Logger(UsuariosController.name);

  constructor(
    private readonly users: UsersService,
    private readonly moodle: MoodleService,
    private readonly config: ConfigService,
  ) {}

  @Patch(':id/rol')
  @Roles(Rol.Superadmin, Rol.AdminAcademico)
  async actualizarRol(
    @Param('id') id: string,
    @Body() dto: ActualizarRolDto,
  ): Promise<UsuarioActualizado> {
    let user = await this.users.findById(id);
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }

    await this.users.actualizarRol(id, dto.rol);
    user.rol = dto.rol;

    // Al admitir a un estudiante sin cuenta Moodle previa, se vincula y
    // matricula en el curso de prueba (mismo flujo idempotente del registro).
    if (dto.rol === Rol.Estudiante && user.moodleUserId === null) {
      user = await vincularYMatricularMoodle(
        { users: this.users, moodle: this.moodle, config: this.config, logger: this.logger },
        user,
      );
    }

    return { id: user.id, nombre: user.nombre, correo: user.correo, rol: user.rol };
  }
}
