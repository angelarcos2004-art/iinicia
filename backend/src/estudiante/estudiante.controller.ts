import { Controller, Get, UseGuards } from '@nestjs/common';
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
}
