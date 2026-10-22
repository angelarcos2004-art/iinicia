import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { Rol } from '../users/rol.enum.js';
import { UsersService } from '../users/users.service.js';

export interface JwtPayload {
  sub: string;
  rol: Rol;
}

/** Usuario autenticado que se adjunta a `request.user`. */
export interface UsuarioAutenticado {
  id: string;
  nombre: string;
  correo: string;
  rol: Rol;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    private readonly users: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  /**
   * Se consulta la base para tener datos y rol frescos: si el usuario fue
   * eliminado o cambió de rol, el token viejo no concede permisos obsoletos.
   */
  async validate(payload: JwtPayload): Promise<UsuarioAutenticado> {
    const user = await this.users.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('Sesión no válida');
    }
    return {
      id: user.id,
      nombre: user.nombre,
      correo: user.correo,
      rol: user.rol,
    };
  }
}
