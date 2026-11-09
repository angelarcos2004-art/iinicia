import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'node:crypto';
import * as http from 'node:http';
import * as https from 'node:https';

interface MoodleUsuario {
  id: number;
}

interface MoodleCursoInscrito {
  id: number;
  shortname: string;
  fullname: string;
  /** null si el curso no tiene seguimiento de finalización activado en Moodle. */
  progress: number | null;
}

export interface MoodleCurso {
  id: number;
  shortname: string;
  fullname: string;
}

interface MoodleErrorBody {
  exception?: string;
  errorcode?: string;
  message?: string;
}

interface MoodleActionEvent {
  id: number;
  name: string;
  timesort: number;
  course?: { fullname?: string };
  action?: { url?: string };
  url?: string;
}

export interface MoodleActividadProxima {
  id: number;
  titulo: string;
  curso: string;
  /** Fecha límite, en ISO-8601 (viene de `timesort`, en segundos UTC). */
  fecha: string;
  url: string | null;
}

const TIMEOUT_MS = 10_000;

/**
 * Cliente de Moodle Web Services (REST). Todo token vive solo aquí, en el
 * backend, leído de MOODLE_TOKEN; nunca se registra en logs ni se devuelve.
 */
@Injectable()
export class MoodleService {
  private readonly logger = new Logger(MoodleService.name);

  constructor(private readonly config: ConfigService) {}

  /**
   * Devuelve el id de Moodle del usuario con ese correo, creándolo solo si
   * no existe. Llamarlo varias veces con el mismo correo nunca duplica.
   */
  async buscarOCrearUsuarioMoodle(correo: string, nombreCompleto: string): Promise<number> {
    const email = correo.trim().toLowerCase();
    if (!email) {
      throw new BadRequestException('El correo es obligatorio');
    }

    const existente = await this.buscarPorCorreo(email);
    if (existente !== null) return existente;

    try {
      return await this.crearUsuario(email, nombreCompleto);
    } catch (error) {
      // Carrera: otra petición lo creó entre la búsqueda y la creación.
      const creadoMientras = await this.buscarPorCorreo(email);
      if (creadoMientras !== null) return creadoMientras;
      throw error;
    }
  }

  private async buscarPorCorreo(email: string): Promise<number | null> {
    const usuarios = await this.llamar<MoodleUsuario[]>('core_user_get_users_by_field', {
      field: 'email',
      'values[0]': email,
    });
    return Array.isArray(usuarios) && usuarios.length > 0 ? usuarios[0].id : null;
  }

  /**
   * Matricula al usuario en el curso (por shortname) con el rol de estudiante
   * (MOODLE_ROLEID_STUDENT, default 5). Moodle no duplica ni falla si ya
   * estaba matriculado, así que es seguro repetirlo.
   */
  async matricularEnCurso(moodleUserId: number, courseShortname: string): Promise<void> {
    const courseId = await this.buscarCursoPorShortname(courseShortname);
    if (courseId === null) {
      throw new BadGatewayException(`No existe el curso "${courseShortname}" en Moodle`);
    }
    const roleId = this.config.get<string>('MOODLE_ROLEID_STUDENT', '5');
    await this.llamar<null>('enrol_manual_enrol_users', {
      'enrolments[0][roleid]': String(roleId),
      'enrolments[0][userid]': String(moodleUserId),
      'enrolments[0][courseid]': String(courseId),
    });
  }

  /**
   * Cursos en los que el usuario está inscrito en Moodle, tal como los
   * reporta core_enrol_get_users_courses (sin inventar progreso: si el
   * curso no tiene seguimiento de finalización activado, Moodle devuelve
   * `progress: null` y así se propaga).
   */
  async obtenerCursosDeUsuario(moodleUserId: number): Promise<MoodleCursoInscrito[]> {
    const cursos = await this.llamar<MoodleCursoInscrito[]>('core_enrol_get_users_courses', {
      userid: String(moodleUserId),
    });
    if (!Array.isArray(cursos)) return [];
    return cursos.map((c) => ({
      id: c.id,
      shortname: c.shortname,
      fullname: c.fullname,
      progress: typeof c.progress === 'number' ? c.progress : null,
    }));
  }

  /**
   * Próximas actividades con fecha límite (tareas, cuestionarios, etc.) del usuario en
   * cualquiera de sus cursos, vía `core_calendar_get_action_events_by_timesort`: la misma
   * función que usa la app móvil oficial de Moodle para "Próximos eventos". Solo trae eventos
   * desde ahora en adelante (no actividades ya vencidas).
   */
  async obtenerActividadesProximas(moodleUserId: number): Promise<MoodleActividadProxima[]> {
    const ahora = Math.floor(Date.now() / 1000);
    const respuesta = await this.llamar<{ events?: MoodleActionEvent[] }>(
      'core_calendar_get_action_events_by_timesort',
      {
        userid: String(moodleUserId),
        timesortfrom: String(ahora),
        limitnum: '10',
      },
    );
    const eventos = respuesta?.events;
    if (!Array.isArray(eventos)) return [];
    return eventos.map((e) => ({
      id: e.id,
      titulo: e.name,
      curso: e.course?.fullname ?? '',
      fecha: new Date(e.timesort * 1000).toISOString(),
      url: e.action?.url ?? e.url ?? null,
    }));
  }

  /**
   * URL de un solo uso (auth_userkey, ver infrastructure/moodle-custom/auth/userkey)
   * que entra a Moodle ya autenticado, sin pedir contraseña. La key expira en
   * segundos y solo sirve una vez, así que hay que generarla justo antes de
   * redirigir al usuario, nunca guardarla.
   */
  async solicitarUrlAutologin(
    correo: string,
    cursoId?: number,
    actividadUrl?: string,
  ): Promise<string> {
    const email = correo.trim().toLowerCase();
    const { loginurl } = await this.llamar<{ loginurl: string }>(
      'auth_userkey_request_login_url',
      { 'user[email]': email },
    );
    if (!loginurl) {
      throw new BadGatewayException('Moodle no devolvió una URL de acceso');
    }
    if (!cursoId && !actividadUrl) return loginurl;
    // Ojo: NO usar this.config MOODLE_URL aquí. En Docker apunta al nombre
    // interno ("http://moodle"), que el navegador del usuario no puede
    // resolver. loginurl ya viene armada por Moodle con su wwwroot público
    // real (ver auth_userkey auth.php get_login_url()), así que se reusa
    // ese mismo origen para el destino tras el login.
    const origen = new URL(loginurl).origin;
    const urlDestino = actividadUrl
      ? this.validarMismoOrigen(actividadUrl, origen)
      : `${origen}/course/view.php?id=${cursoId}`;
    const separador = loginurl.includes('?') ? '&' : '?';
    return `${loginurl}${separador}wantsurl=${encodeURIComponent(urlDestino)}`;
  }

  /**
   * `actividadUrl` viene de `core_calendar_get_action_events_by_timesort` (ver
   * `obtenerActividadesProximas`), así que en teoría ya es de este mismo Moodle, pero como
   * llega hasta aquí por un query param que el cliente controla, se revalida el origen antes
   * de usarla como `wantsurl` (evita que alguien la cambie por una URL arbitraria).
   */
  private validarMismoOrigen(url: string, origenEsperado: string): string {
    let origenReal: string;
    try {
      origenReal = new URL(url).origin;
    } catch {
      throw new BadRequestException('URL de actividad inválida');
    }
    if (origenReal !== origenEsperado) {
      throw new BadRequestException('La actividad no pertenece a esta instancia de Moodle');
    }
    return url;
  }

  /**
   * Todos los cursos reales de Moodle (excluye el curso "sitio", id 1), para que el admin
   * elija de una lista en vez de escribir el shortname a mano. Siempre refleja el catálogo
   * actual de Moodle: no hay copia local que se desactualice.
   */
  async listarCursos(): Promise<MoodleCurso[]> {
    const cursos = await this.llamar<MoodleCurso[]>('core_course_get_courses', {});
    if (!Array.isArray(cursos)) return [];
    return cursos
      .filter((c) => c.id !== 1)
      .map((c) => ({ id: c.id, shortname: c.shortname, fullname: c.fullname }));
  }

  private async buscarCursoPorShortname(shortname: string): Promise<number | null> {
    const respuesta = await this.llamar<{ courses?: MoodleUsuario[] }>(
      'core_course_get_courses_by_field',
      { field: 'shortname', value: shortname },
    );
    const cursos = respuesta?.courses;
    return Array.isArray(cursos) && cursos.length > 0 ? cursos[0].id : null;
  }

  private async crearUsuario(email: string, nombreCompleto: string): Promise<number> {
    const { firstname, lastname } = this.separarNombre(nombreCompleto);
    const creados = await this.llamar<MoodleUsuario[]>('core_user_create_users', {
      'users[0][username]': this.derivarUsername(email),
      'users[0][password]': this.generarPassword(),
      'users[0][firstname]': firstname,
      'users[0][lastname]': lastname,
      'users[0][email]': email,
      'users[0][auth]': 'manual',
    });
    if (!Array.isArray(creados) || typeof creados[0]?.id !== 'number') {
      throw new BadGatewayException('Moodle devolvió una respuesta inesperada');
    }
    return creados[0].id;
  }

  /** Moodle exige usernames en minúsculas con [a-z0-9_.@-]. */
  private derivarUsername(email: string): string {
    return email.replace(/[^a-z0-9_.@-]/g, '_').slice(0, 100);
  }

  private separarNombre(nombreCompleto: string): { firstname: string; lastname: string } {
    const partes = nombreCompleto.trim().split(/\s+/).filter(Boolean);
    const firstname = partes.shift() ?? 'Usuario';
    // Moodle no acepta apellido vacío.
    return { firstname, lastname: partes.join(' ') || '-' };
  }

  /**
   * Contraseña aleatoria que cumple la política por defecto de Moodle
   * (mayúscula, minúscula, dígito y símbolo). Nadie la usa: el acceso real
   * será por IINICIA/SSO.
   */
  private generarPassword(): string {
    return `${randomBytes(18).toString('base64url')}aZ9#`;
  }

  /**
   * Moodle redirige (303 a su $CFG->wwwroot) cualquier petición cuyo Host no
   * coincida con ese wwwroot configurado — incluida webservice/rest/server.php.
   * En Docker, el backend llega a Moodle por el nombre de servicio interno
   * ("moodle"), distinto del wwwroot público ("localhost:8080"), y fetch()
   * no puede forzar el header Host (la spec Fetch lo prohíbe), así que la
   * petición termina siguiendo esa redirección hacia sí mismo y falla.
   * MOODLE_HOST_HEADER (opcional, solo se usa en Docker) fuerza el Host
   * correcto usando node:http directamente.
   */
  private async postForm(
    url: string,
    body: URLSearchParams,
  ): Promise<{ status: number; json: () => Promise<unknown> }> {
    const hostHeader = this.config.get<string>('MOODLE_HOST_HEADER');
    if (!hostHeader) {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      return { status: response.status, json: () => response.json() };
    }

    const bodyText = body.toString();
    const target = new URL(url);
    const client = target.protocol === 'https:' ? https : http;
    const { status, text } = await new Promise<{ status: number; text: string }>(
      (resolve, reject) => {
        const req = client.request(
          {
            hostname: target.hostname,
            port: target.port || (target.protocol === 'https:' ? 443 : 80),
            path: target.pathname,
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'Content-Length': Buffer.byteLength(bodyText),
              Host: hostHeader,
            },
            timeout: TIMEOUT_MS,
          },
          (res) => {
            let data = '';
            res.on('data', (chunk: Buffer) => (data += chunk));
            res.on('end', () => resolve({ status: res.statusCode ?? 0, text: data }));
          },
        );
        req.on('timeout', () => req.destroy(new Error('Moodle no respondió a tiempo')));
        req.on('error', reject);
        req.write(bodyText);
        req.end();
      },
    );
    return { status, json: () => Promise.resolve(JSON.parse(text)) };
  }

  private async llamar<T>(wsfunction: string, params: Record<string, string>): Promise<T> {
    const baseUrl = this.config.getOrThrow<string>('MOODLE_URL').replace(/\/+$/, '');
    const token = this.config.getOrThrow<string>('MOODLE_TOKEN');
    const body = new URLSearchParams({
      wstoken: token,
      wsfunction,
      moodlewsrestformat: 'json',
      ...params,
    });

    let response: { status: number; json: () => Promise<unknown> };
    try {
      response = await this.postForm(`${baseUrl}/webservice/rest/server.php`, body);
    } catch (error) {
      this.logger.error(`No se pudo conectar con Moodle (${wsfunction}): ${String(error)}`);
      throw new BadGatewayException('No se pudo conectar con Moodle');
    }

    if (response.status < 200 || response.status >= 300) {
      this.logger.error(`Moodle respondió HTTP ${response.status} (${wsfunction})`);
      throw new BadGatewayException('Moodle respondió con un error');
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new BadGatewayException('Moodle devolvió una respuesta inválida');
    }

    // Moodle reporta errores con HTTP 200 y { exception, errorcode, message }.
    const err = data as MoodleErrorBody | null;
    if (err && !Array.isArray(data) && typeof err === 'object' && err.exception) {
      this.logger.error(`Moodle error en ${wsfunction}: ${err.errorcode} - ${err.message}`);
      throw new BadGatewayException('Moodle rechazó la operación');
    }
    return data as T;
  }
}
