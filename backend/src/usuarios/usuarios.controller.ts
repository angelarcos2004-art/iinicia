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
import type { UsuarioAutenticado } from '../auth/jwt.strategy.js';
import { Roles } from '../auth/roles.decorator.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { UsuarioActual } from '../auth/usuario-actual.decorator.js';
import { MateriasService } from '../materias/materias.service.js';
import { vincularYMatricularMoodle } from '../moodle/moodle-onboarding.js';
import { MoodleCurso, MoodleService } from '../moodle/moodle.service.js';
import { PushService } from '../push/push.service.js';
import { ProgramasService } from '../programas/programas.service.js';
import { Rol } from '../users/rol.enum.js';
import { UsersService } from '../users/users.service.js';
import { ActualizarRolDto } from './dto/actualizar-rol.dto.js';
import { AsignarCursoDto } from './dto/asignar-curso.dto.js';
import { AsignarProgramaCoordinadoDto } from './dto/asignar-programa-coordinado.dto.js';
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
  /** Ámbito del coordinador (solo relevante si rol = coordinador); null = sin ámbito/ve todo. */
  programaCoordinadoId: string | null;
  programaCoordinadoNombre: string | null;
}

export interface EstudianteDeProfesor {
  id: string;
  nombre: string;
  correo: string;
  /** Cursos reales (Moodle) que comparte con el profesor que hace la consulta. */
  cursos: string[];
  /** false si nunca abrió la app Android con sesión iniciada: notificar le devolvería 400. */
  tieneDispositivo: boolean;
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

  /**
   * Lista de usuarios para el panel administrativo; `rol` filtra opcionalmente. Un coordinador
   * con ámbito asignado (ver PATCH :id/programa-coordinado) solo ve usuarios de ese programa
   * (docs/requerimientos.md §11: "acceso limitado al programa o unidad asignada"); sin ámbito,
   * ve todo igual que hoy.
   */
  @Get()
  @Roles(Rol.Superadmin, Rol.AdminAcademico, Rol.Coordinador)
  async listar(
    @UsuarioActual() actual: UsuarioAutenticado,
    @Query('rol') rol?: string,
  ): Promise<UsuarioListado[]> {
    if (rol && !Object.values(Rol).includes(rol as Rol)) {
      throw new BadRequestException('Rol inválido');
    }
    let usuarios = await this.users.listar(rol as Rol | undefined);
    if (actual.rol === Rol.Coordinador) {
      const coordinador = await this.users.findById(actual.id);
      const ambito = coordinador?.programaCoordinadoId ?? null;
      if (ambito) {
        usuarios = usuarios.filter((u) => u.programaInteresId === ambito);
      }
    }
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
      programaCoordinadoId: u.programaCoordinadoId,
      programaCoordinadoNombre: u.programaCoordinadoId
        ? nombrePorProgramaId.get(u.programaCoordinadoId) ?? u.programaCoordinadoId
        : null,
    }));
  }

  /** Catálogo de cursos real de Moodle, para que el admin elija al matricular (ver POST :id/matricula). */
  @Get('cursos-moodle')
  @Roles(Rol.Superadmin, Rol.AdminAcademico)
  async listarCursosMoodle(): Promise<MoodleCurso[]> {
    return this.moodle.listarCursos();
  }

  /**
   * Estudiantes reales (Moodle) de los cursos que imparte el profesor que hace la consulta, para
   * poder notificarlos (ver POST :id/notificar) sin exponerle la lista completa de usuarios de
   * la plataforma (docs/requerimientos.md §11: "no puede administrar usuarios globales"). Se
   * agrupan por correo porque un mismo estudiante puede estar en más de un curso del profesor.
   * Un estudiante de Moodle sin cuenta de portal vinculada (p. ej. generado por
   * tool_generator) se omite: no hay a quién notificar en la app.
   */
  @Get('mis-estudiantes')
  @Roles(Rol.Profesor)
  async misEstudiantes(@UsuarioActual() actual: UsuarioAutenticado): Promise<EstudianteDeProfesor[]> {
    const profesor = await this.users.findById(actual.id);
    if (!profesor?.moodleUserId) return [];

    const cursos = await this.moodle.obtenerCursosDeUsuario(profesor.moodleUserId);
    const porCorreo = new Map<string, { nombre: string; cursos: Set<string> }>();
    for (const curso of cursos) {
      const estudiantes = await this.moodle.obtenerEstudiantesDeCurso(curso.id);
      for (const estudiante of estudiantes) {
        const entrada = porCorreo.get(estudiante.email) ?? {
          nombre: estudiante.fullname,
          cursos: new Set<string>(),
        };
        entrada.cursos.add(curso.fullname);
        porCorreo.set(estudiante.email, entrada);
      }
    }

    const resultado: EstudianteDeProfesor[] = [];
    for (const [correo, { cursos: cursosCompartidos }] of porCorreo) {
      const usuario = await this.users.findByCorreo(correo);
      if (!usuario) continue;
      resultado.push({
        id: usuario.id,
        nombre: usuario.nombre,
        correo: usuario.correo,
        cursos: [...cursosCompartidos],
        tieneDispositivo: usuario.fcmToken !== null,
      });
    }
    return resultado;
  }

  /** Asigna (o quita, con programaId null) el ámbito de un coordinador. Ver GET /usuarios. */
  @Patch(':id/programa-coordinado')
  @Roles(Rol.Superadmin, Rol.AdminAcademico)
  async asignarProgramaCoordinado(
    @Param('id') id: string,
    @Body() dto: AsignarProgramaCoordinadoDto,
  ): Promise<UsuarioListado> {
    const user = await this.users.findById(id);
    if (!user) {
      throw new NotFoundException('Usuario no encontrado');
    }
    if (user.rol !== Rol.Coordinador) {
      throw new BadRequestException('Solo los coordinadores tienen ámbito de programa');
    }
    if (dto.programaId && !(await this.programas.findById(dto.programaId))) {
      throw new BadRequestException('Programa no encontrado');
    }
    await this.users.actualizarProgramaCoordinado(id, dto.programaId ?? null);
    return {
      id: user.id,
      nombre: user.nombre,
      correo: user.correo,
      rol: user.rol,
      moodleUserId: user.moodleUserId,
      createdAt: user.createdAt,
      programaInteresNombre: await this.nombrePrograma(user.programaInteresId),
      programaCoordinadoId: dto.programaId ?? null,
      programaCoordinadoNombre: await this.nombrePrograma(dto.programaId ?? null),
    };
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
      programaCoordinadoId: actualizado.programaCoordinadoId,
      programaCoordinadoNombre: await this.nombrePrograma(actualizado.programaCoordinadoId),
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
