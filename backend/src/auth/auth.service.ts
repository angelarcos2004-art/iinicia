import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
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
  constructor(
    private readonly users: UsersService,
    private readonly jwt: JwtService,
  ) {}

  async login(dto: LoginDto): Promise<AuthResponse> {
    const user = await this.users.findByCorreo(dto.correo);
    const hash = user?.passwordHash ?? DUMMY_HASH;
    const ok = await bcrypt.compare(dto.password, hash);
    if (!user || !ok) {
      throw new UnauthorizedException('Correo o contraseña incorrectos');
    }
    return this.buildResponse(user);
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
    return this.buildResponse(user);
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
