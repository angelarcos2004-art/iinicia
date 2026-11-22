import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import { randomBytes } from 'node:crypto';
import { MailService } from '../mail/mail.service.js';
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
  private readonly googleClient: OAuth2Client;

  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly mail: MailService,
  ) {
    this.googleClient = new OAuth2Client(this.config.get<string>('GOOGLE_CLIENT_ID'));
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    const user = await this.users.findByCorreo(dto.correo);
    const hash = user?.passwordHash ?? DUMMY_HASH;
    const ok = await bcrypt.compare(dto.password, hash);
    if (!user || !ok) {
      throw new UnauthorizedException('Correo o contraseña incorrectos');
    }
    return this.buildResponse(user);
  }

  /**
   * Verifica el idToken de Google (firma + audiencia) y entra con la cuenta cuyo correo
   * coincida, creándola como aspirante si es la primera vez que inicia sesión así. Acepta el
   * idToken tanto del cliente web (GOOGLE_CLIENT_ID) como del cliente Android
   * (GOOGLE_ANDROID_CLIENT_ID, opcional), porque cada plataforma de OAuth tiene su propio
   * client ID pero comparten el mismo endpoint.
   */
  async loginConGoogle(idToken: string): Promise<AuthResponse> {
    const audiencias = [
      this.config.getOrThrow<string>('GOOGLE_CLIENT_ID'),
      this.config.get<string>('GOOGLE_ANDROID_CLIENT_ID'),
    ].filter((id): id is string => Boolean(id));

    const ticket = await this.googleClient.verifyIdToken({
      idToken,
      audience: audiencias,
    }).catch(() => {
      throw new UnauthorizedException('Token de Google inválido');
    });
    const payload = ticket.getPayload();
    if (!payload?.email || !payload.email_verified) {
      throw new UnauthorizedException('Token de Google inválido');
    }

    let user = await this.users.findByCorreo(payload.email);
    if (!user) {
      const passwordHash = await bcrypt.hash(randomBytes(32).toString('base64url'), BCRYPT_ROUNDS);
      user = await this.users.create({
        nombre: payload.name ?? payload.email,
        correo: payload.email,
        passwordHash,
        rol: Rol.Aspirante,
      });
    }
    return this.buildResponse(user);
  }

  /**
   * Crea la cuenta como aspirante, sin tocar Moodle (docs/requerimientos.md §12: "tener una
   * cuenta no debe implicar acceso automático a los cursos"). El acceso a Moodle solo lo
   * concede un administrador, vía UsuariosController.actualizarRol o .asignarCurso.
   */
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
