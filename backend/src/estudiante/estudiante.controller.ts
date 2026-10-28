import { BadRequestException, Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import type { UsuarioAutenticado } from '../auth/jwt.strategy.js';
import { UsuarioActual } from '../auth/usuario-actual.decorator.js';
import { MoodleService } from '../moodle/moodle.service.js';
import { UsersService } from '../users/users.service.js';

export interface CursoInscrito {
  id: number;
  nombre: string;
  shortname: string;
  progreso: number | null;
}

export interface ActividadProxima {
  id: number;
  titulo: string;
  curso: string;
  fecha: string;
  url: string | null;
}

@Controller('estudiante')
@UseGuards(JwtAuthGuard)
export class EstudianteController {
  constructor(
    private readonly users: UsersService,
    private readonly moodle: MoodleService,
  ) {}

  /**
   * Cursos reales del usuario autenticado, consultados directo a Moodle
   * (core_enrol_get_users_courses). Si el usuario todavía no tiene cuenta
   * Moodle vinculada (moodleUserId nulo), devuelve una lista vacía en vez
   * de error: es un estado válido, no una falla.
   */
  @Get('cursos')
  async misCursos(@UsuarioActual() usuarioActual: UsuarioAutenticado): Promise<CursoInscrito[]> {
    const user = await this.users.findById(usuarioActual.id);
    if (!user?.moodleUserId) {
      return [];
    }
    const cursos = await this.moodle.obtenerCursosDeUsuario(user.moodleUserId);
    return cursos.map((c) => ({
      id: c.id,
      nombre: c.fullname,
      shortname: c.shortname,
      progreso: c.progress,
    }));
  }

  /**
   * Próximas actividades con fecha límite (tareas, cuestionarios, etc.) de todos los cursos
   * del usuario. Mismo criterio que `misCursos`: sin cuenta Moodle vinculada, lista vacía en
   * vez de error.
   */
  @Get('actividades')
  async proximasActividades(
    @UsuarioActual() usuarioActual: UsuarioAutenticado,
  ): Promise<ActividadProxima[]> {
    const user = await this.users.findById(usuarioActual.id);
    if (!user?.moodleUserId) {
      return [];
    }
    return this.moodle.obtenerActividadesProximas(user.moodleUserId);
  }

  /**
   * URL de un solo uso para entrar a Moodle ya autenticado (SSO vía
   * auth_userkey), sin pedir una segunda contraseña. Requiere que el usuario
   * ya tenga cuenta Moodle vinculada.
   */
  @Get('moodle-sso')
  async entrarAlCampus(
    @UsuarioActual() usuarioActual: UsuarioAutenticado,
    @Query('cursoId') cursoId?: string,
  ): Promise<{ url: string }> {
    const user = await this.users.findById(usuarioActual.id);
    if (!user?.moodleUserId) {
      throw new BadRequestException('Tu cuenta todavía no está vinculada a Moodle');
    }
    const url = await this.moodle.solicitarUrlAutologin(
      user.correo,
      cursoId ? Number(cursoId) : undefined,
    );
    return { url };
  }
}
