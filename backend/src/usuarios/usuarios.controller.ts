import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Logger,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { vincularYMatricularMoodle } from '../moodle/moodle-onboarding.js';
import { MoodleService } from '../moodle/moodle.service.js';
import { PushService } from '../push/push.service.js';
import { Rol } from '../users/rol.enum.js';
import { UsersService } from '../users/users.service.js';
import { ActualizarRolDto } from './dto/actualizar-rol.dto.js';
import { NotificarDto } from './dto/notificar.dto.js';

export interface UsuarioActualizado {
  id: string;
  nombre: string;
  correo: string;
  rol: Rol;
}

export interface UsuarioListado extends UsuarioActualizado {
  moodleUserId: number | null;
  createdAt: Date;
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
    private readonly push: PushService,
  ) {}

  /** Lista de usuarios para el panel administrativo; `rol` filtra opcionalmente. */
  @Get()
  @Roles(Rol.Superadmin, Rol.AdminAcademico, Rol.Coordinador)
  async listar(@Query('rol') rol?: string): Promise<UsuarioListado[]> {
    if (rol && !Object.values(Rol).includes(rol as Rol)) {
      throw new BadRequestException('Rol inválido');
    }
    const usuarios = await this.users.listar(rol as Rol | undefined);
    return usuarios.map((u) => ({
      id: u.id,
      nombre: u.nombre,
      correo: u.correo,
      rol: u.rol,
      moodleUserId: u.moodleUserId,
      createdAt: u.createdAt,
    }));
  }

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

  /**
   * Notificación push controlada a un estudiante (docs/requerimientos.md CA-14: "las
   * notificaciones móviles pueden enviarse a estudiantes de forma controlada"). Requiere que
   * el usuario ya haya abierto la app Android con sesión iniciada al menos una vez (eso es lo
   * que registra el token, ver EstudianteController.registrarPushToken).
   */
  @Post(':id/notificar')
  @Roles(Rol.Superadmin, Rol.AdminAcademico, Rol.Coordinador, Rol.Profesor)
  async notificar(@Param('id') id: string, @Body() dto: NotificarDto): Promise<{ enviado: true }> {
    const user = await this.users.findById(id);
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
    if (!user.fcmToken) {
      throw new BadRequestException('Este usuario no tiene un dispositivo registrado para notificaciones');
    }
    await this.push.enviar(user.fcmToken, dto.titulo, dto.mensaje);
    return { enviado: true };
  }
}
