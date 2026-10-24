import { ForbiddenException, Injectable } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import type { UsuarioAutenticado } from './jwt.strategy.js';
import { ROLES_KEY } from './roles.decorator.js';

/**
 * Debe usarse junto a JwtAuthGuard (después de él, para que `request.user`
 * ya exista). Sin un `@Roles(...)` en la ruta o el controlador, deja pasar
 * a cualquier usuario autenticado.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const { user } = context
      .switchToHttp()
      .getRequest<Request & { user?: UsuarioAutenticado }>();
    if (!user || !requiredRoles.includes(user.rol)) {
      throw new ForbiddenException('No tienes permiso para esta acción');
    }
    return true;
  }
}
