import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService, type AuthResponse } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import { RecuperarDto } from './dto/recuperar.dto.js';
import { RegistroDto } from './dto/registro.dto.js';
import { RestablecerDto } from './dto/restablecer.dto.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import type { UsuarioAutenticado } from './jwt.strategy.js';
import { UsuarioActual } from './usuario-actual.decorator.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  /** Límite estricto: evita fuerza bruta de contraseñas (docs/requerimientos.md Sec. 16). */
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto): Promise<AuthResponse> {
    return this.auth.login(dto);
  }

  /** El contrato del portal espera 200 OK (no 201) en el registro. */
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @Post('registro')
  @HttpCode(HttpStatus.OK)
  registro(@Body() dto: RegistroDto): Promise<AuthResponse> {
    return this.auth.registro(dto);
  }

  /**
   * Siempre responde igual, exista o no la cuenta (ver AuthService.recuperar): nunca hay que
   * delatar qué correos están registrados.
   */
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @Post('recuperar')
  @HttpCode(HttpStatus.OK)
  async recuperar(@Body() dto: RecuperarDto): Promise<{ mensaje: string }> {
    await this.auth.recuperar(dto.correo);
    return { mensaje: 'Si el correo existe, se envió un enlace de recuperación.' };
  }

  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @Post('restablecer')
  @HttpCode(HttpStatus.OK)
  async restablecer(@Body() dto: RestablecerDto): Promise<{ mensaje: string }> {
    await this.auth.restablecer(dto);
    return { mensaje: 'Contraseña actualizada correctamente.' };
  }

  /** Devuelve el usuario del token: `{ id, nombre, correo, rol }`. */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@UsuarioActual() usuario: UsuarioAutenticado): UsuarioAutenticado {
    return usuario;
  }
}
