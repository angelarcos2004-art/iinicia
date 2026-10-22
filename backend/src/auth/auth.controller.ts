import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { AuthService, type AuthResponse } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import { RegistroDto } from './dto/registro.dto.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import type { UsuarioAutenticado } from './jwt.strategy.js';
import { UsuarioActual } from './usuario-actual.decorator.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto): Promise<AuthResponse> {
    return this.auth.login(dto);
  }

  /** El contrato del portal espera 200 OK (no 201) en el registro. */
  @Post('registro')
  @HttpCode(HttpStatus.OK)
  registro(@Body() dto: RegistroDto): Promise<AuthResponse> {
    return this.auth.registro(dto);
  }

  /** Devuelve el usuario del token: `{ id, nombre, correo, rol }`. */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@UsuarioActual() usuario: UsuarioAutenticado): UsuarioAutenticado {
    return usuario;
  }
}
