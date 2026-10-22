import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import { MoodleService } from '../moodle/moodle.service.js';
import { Rol } from '../users/rol.enum.js';
import type { User } from '../users/user.entity.js';
import { UsersService } from '../users/users.service.js';
import type { LoginDto } from './dto/login.dto.js';
import type { RegistroDto } from './dto/registro.dto.js';

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
   * Vincula (o crea, de forma idempotente) la cuenta Moodle del usuario.
   * Nota: docs/requerimientos.md describe esto ocurriendo cuando un
   * aspirante es *admitido* por un administrador academico, no en el
   * autorregistro. Para esta fase (sin flujo de admision todavia) se
   * dispara aqui mismo, como demostracion funcional de la integracion.
   *
   * Nunca bloquea login/registro: si Moodle no responde, el usuario sigue
   * teniendo su cuenta IINICIA y queda con moodleUserId en null para
   * reintentarse en un login posterior.
   */
  private async vincularMoodle(user: User): Promise<User> {
    try {
      const moodleUserId = await this.moodle.buscarOCrearUsuarioMoodle(user.correo, user.nombre);
      await this.users.actualizarMoodleUserId(user.id, moodleUserId);
      user.moodleUserId = moodleUserId;
      return user;
    } catch (error) {
      this.logger.warn(
        `No se pudo vincular a Moodle el usuario ${user.id}: ${String(error)}`,
      );
      return user;
    }
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
