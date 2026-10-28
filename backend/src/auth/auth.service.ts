import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import { MailService } from '../mail/mail.service.js';
import { vincularYMatricularMoodle } from '../moodle/moodle-onboarding.js';
import { MoodleService } from '../moodle/moodle.service.js';
import { Rol } from '../users/rol.enum.js';
import type { User } from '../users/user.entity.js';
import { UsersService } from '../users/users.service.js';
import type { LoginDto } from './dto/login.dto.js';
import type { RegistroDto } from './dto/registro.dto.js';
import type { RestablecerDto } from './dto/restablecer.dto.js';

export interface UsuarioPublico {
  id: string;
  nombre: string;
  correo: string;
  rol: Rol;
}

export interface AuthResponse {
  token: string;
  usuario: UsuarioPublico;
}

const BCRYPT_ROUNDS = 10;
/** Hash válido de relleno para igualar tiempos cuando el correo no existe. */
const DUMMY_HASH = bcrypt.hashSync('iinicia-dummy-password', BCRYPT_ROUNDS);

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly moodle: MoodleService,
    private readonly config: ConfigService,
    private readonly mail: MailService,
  ) {}

  async login(dto: LoginDto): Promise<AuthResponse> {
    const user = await this.users.findByCorreo(dto.correo);
    const hash = user?.passwordHash ?? DUMMY_HASH;
    const ok = await bcrypt.compare(dto.password, hash);
    if (!user || !ok) {
      throw new UnauthorizedException('Correo o contraseña incorrectos');
    }
    // Reintento silencioso para cuentas creadas antes de esta integracion
    // (o cuyo alta en Moodle fallo la primera vez): no bloquea el login.
    const vinculado = user.moodleUserId === null ? await this.vincularMoodle(user) : user;
    return this.buildResponse(vinculado);
  }

  async registro(dto: RegistroDto): Promise<AuthResponse> {
    if (await this.users.findByCorreo(dto.correo)) {
      throw new BadRequestException('Ya existe una cuenta con ese correo');
    }
    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    let user: User;
    try {
      user = await this.users.create({
        nombre: dto.nombreCompleto,
        correo: dto.correo,
        passwordHash,
        rol: Rol.Aspirante,
        programaInteresId: dto.programaInteresId,
        aceptaAvisoPrivacidad: dto.aceptaAvisoPrivacidad,
        deseaInformacionBecas: dto.deseaInformacionBecas,
      });
    } catch (error) {
      // 23505 = unique_violation en PostgreSQL (carrera entre dos registros)
      if ((error as { code?: string }).code === '23505') {
        throw new BadRequestException('Ya existe una cuenta con ese correo');
      }
      throw error;
    }
    user = await this.vincularMoodle(user);
    return this.buildResponse(user);
  }

  /**
   * Genera un enlace de recuperación de un solo uso (expira en 1 hora) y lo envía por correo.
   * Siempre "funciona" igual exista o no la cuenta: nunca hay que revelar qué correos están
   * registrados (docs/requerimientos.md Sec. 16, privacidad/seguridad).
   */
  async recuperar(correo: string): Promise<void> {
    const user = await this.users.findByCorreo(correo);
    if (!user) return;

    const tokenCrudo = randomBytes(32).toString('base64url');
    const tokenHash = await bcrypt.hash(tokenCrudo, BCRYPT_ROUNDS);
    const expira = new Date(Date.now() + 60 * 60 * 1000);
    await this.users.guardarTokenRecuperacion(user.id, tokenHash, expira);

    const frontendUrl = this.config.get<string>('FRONTEND_URL', 'http://localhost:3000');
    const enlace = `${frontendUrl}/restablecer?correo=${encodeURIComponent(user.correo)}&token=${tokenCrudo}`;
    await this.mail.enviarRecuperacion(user.correo, enlace);
  }

  /** Verifica el token (hash + expiración) y reemplaza la contraseña. Invalida el token al usarlo. */
  async restablecer(dto: RestablecerDto): Promise<void> {
    const user = await this.users.findByCorreo(dto.correo);
    const vencido = !user?.resetPasswordExpira || user.resetPasswordExpira.getTime() < Date.now();
    const coincide =
      user?.resetPasswordTokenHash && (await bcrypt.compare(dto.token, user.resetPasswordTokenHash));
    if (!user || !coincide || vencido) {
      throw new BadRequestException('El enlace de recuperación es inválido o ya venció');
    }

    const passwordHash = await bcrypt.hash(dto.nuevaPassword, BCRYPT_ROUNDS);
    await this.users.actualizarPasswordHash(user.id, passwordHash);
    await this.users.limpiarTokenRecuperacion(user.id);
  }

  /**
   * Vincula (o crea, de forma idempotente) la cuenta Moodle del usuario y lo
   * matricula en el curso de prueba. Nota: docs/requerimientos.md describe
   * esto ocurriendo cuando un aspirante es *admitido* por un administrador
   * academico (ver UsuariosController.actualizarRol), no en el
   * autorregistro. Para esta fase se dispara aqui tambien, como
   * demostracion funcional de la integracion. Nunca bloquea login/registro:
   * ver vincularYMatricularMoodle.
   */
  private vincularMoodle(user: User): Promise<User> {
    return vincularYMatricularMoodle(
      { users: this.users, moodle: this.moodle, config: this.config, logger: this.logger },
      user,
    );
  }

  private async buildResponse(user: User): Promise<AuthResponse> {
    const token = await this.jwt.signAsync({ sub: user.id, rol: user.rol });
    return {
      token,
      usuario: {
        id: user.id,
        nombre: user.nombre,
        correo: user.correo,
        rol: user.rol,
      },
    };
  }
}
