import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { UsuarioAutenticado } from './jwt.strategy.js';

/** Obtiene el usuario que `JwtAuthGuard` dejó en la petición. */
export const UsuarioActual = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): UsuarioAutenticado =>
    ctx.switchToHttp().getRequest<Request & { user: UsuarioAutenticado }>().user,
);
