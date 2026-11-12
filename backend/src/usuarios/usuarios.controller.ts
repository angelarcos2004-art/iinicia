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
import { MateriasService } from '../materias/materias.service.js';
import { vincularYMatricularMoodle } from '../moodle/moodle-onboarding.js';
import { MoodleCurso, MoodleService } from '../moodle/moodle.service.js';
import { PushService } from '../push/push.service.js';
import { ProgramasService } from '../programas/programas.service.js';
import { Rol } from '../users/rol.enum.js';
import { UsersService } from '../users/users.service.js';
import { ActualizarRolDto } from './dto/actualizar-rol.dto.js';
import { AsignarCursoDto } from './dto/asignar-curso.dto.js';
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
  /** Programa que el usuario eligió al registrarse (ver ProgramasService), o null si no tiene. */
  programaInteresNombre: string | null;
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
    private readonly programas: ProgramasService,
    private readonly materias: MateriasService,
  ) {}

  /** Lista de usuarios para el panel administrativo; `rol` filtra opcionalmente. */
  @Get()
  @Roles(Rol.Superadmin, Rol.AdminAcademico, Rol.Coordinador)
  async listar(@Query('rol') rol?: string): Promise<UsuarioListado[]> {
    if (rol && !Object.values(Rol).includes(rol as Rol)) {
      throw new BadRequestException('Rol inválido');
    }
    const usuarios = await this.users.listar(rol as Rol | undefined);
    const programas = await this.programas.listar();
    const nombrePorProgramaId = new Map(programas.map((p) => [p.id, p.nombre]));
    return usuarios.map((u) => ({
      id: u.id,
      nombre: u.nombre,
      correo: u.correo,
      rol: u.rol,
      moodleUserId: u.moodleUserId,
      createdAt: u.createdAt,
      programaInteresNombre: u.programaInteresId
        ? nombrePorProgramaId.get(u.programaInteresId) ?? u.programaInteresId
        : null,
    }));
  }

  /** Catálogo de cursos real de Moodle, para que el admin elija al matricular (ver POST :id/matricula). */
  @Get('cursos-moodle')
  @Roles(Rol.Superadmin, Rol.AdminAcademico)
  async listarCursosMoodle(): Promise<MoodleCurso[]> {
    return this.moodle.listarCursos();
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

    // Al admitir a un estudiante sin cuenta Moodle previa, se vincula y matricula en el curso
    // de su programa de interés (o el curso de prueba si ese programa no tiene uno asignado).
    if (dto.rol === Rol.Estudiante && user.moodleUserId === null) {
      const curso = await this.programas.obtenerMoodleCourseShortname(user.programaInteresId);
      user = await vincularYMatricularMoodle(
        { users: this.users, moodle: this.moodle, config: this.config, logger: this.logger },
        user,
        curso,
      );
    }

    return { id: user.id, nombre: user.nombre, correo: user.correo, rol: user.rol };
  }

  /**
   * El administrador asigna (matricula) a un aspirante o estudiante en un curso de Moodle
   * elegido explícitamente por él, a diferencia de `actualizarRol`, que infiere el curso del
   * programa de interés que el usuario eligió al registrarse. Vincula la cuenta Moodle si
   * aún no existe y puede repetirse para matricular en más cursos (matricularEnCurso es
   * idempotente).
   */
  @Post(':id/matricula')
  @Roles(Rol.Superadmin, Rol.AdminAcademico)
  async asignarCurso(
    @Param('id') id: string,
    @Body() dto: AsignarCursoDto,
  ): Promise<UsuarioListado> {
    const user = await this.users.findById(id);
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
    if (user.rol !== Rol.Aspirante && user.rol !== Rol.Estudiante) {
      throw new BadRequestException('Solo aspirantes o estudiantes pueden matricularse en Moodle');
    }
    // Si el curso es una materia de la carrera elegida por el usuario (ver MateriasService),
    // bloquea la matrícula mientras falte aprobar sus prerequisitos. Un curso suelto sin
    // carrera, o sin materias registradas, no tiene seriación y pasa de largo.
    await this.materias.verificarPrerequisitos(user, dto.cursoShortname);

    const actualizado = await vincularYMatricularMoodle(
      { users: this.users, moodle: this.moodle, config: this.config, logger: this.logger },
      user,
      dto.cursoShortname,
    );

    return {
      id: actualizado.id,
      nombre: actualizado.nombre,
      correo: actualizado.correo,
      rol: actualizado.rol,
      moodleUserId: actualizado.moodleUserId,
      createdAt: actualizado.createdAt,
      programaInteresNombre: await this.nombrePrograma(actualizado.programaInteresId),
    };
  }

  private async nombrePrograma(programaInteresId: string | null): Promise<string | null> {
    if (!programaInteresId) return null;
    const programa = await this.programas.findById(programaInteresId);
    return programa?.nombre ?? programaInteresId;
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
    await this.push.enviar(
      user.fcmToken,
      dto.titulo,
      dto.mensaje,
      dto.cursoId ? { cursoId: dto.cursoId } : undefined,
    );
    return { enviado: true };
  }
}
