import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'node:crypto';

interface MoodleUsuario {
  id: number;
}

interface MoodleErrorBody {
  exception?: string;
  errorcode?: string;
  message?: string;
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

  private async llamar<T>(wsfunction: string, params: Record<string, string>): Promise<T> {
    const baseUrl = this.config.getOrThrow<string>('MOODLE_URL').replace(/\/+$/, '');
    const token = this.config.getOrThrow<string>('MOODLE_TOKEN');
    const body = new URLSearchParams({
      wstoken: token,
      wsfunction,
      moodlewsrestformat: 'json',
      ...params,
    });

    let response: Response;
    try {
      response = await fetch(`${baseUrl}/webservice/rest/server.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (error) {
      this.logger.error(`No se pudo conectar con Moodle (${wsfunction}): ${String(error)}`);
      throw new BadGatewayException('No se pudo conectar con Moodle');
    }

    if (!response.ok) {
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
