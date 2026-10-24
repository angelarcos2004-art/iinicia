import { ForbiddenException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import { Rol } from '../users/rol.enum.js';
import type { UsuarioAutenticado } from './jwt.strategy.js';
import { RolesGuard } from './roles.guard.js';

function makeContext(user: UsuarioAutenticado | undefined, requiredRoles: Rol[] | undefined) {
  const reflector = { getAllAndOverride: vi.fn().mockReturnValue(requiredRoles) } as unknown as Reflector;
  const context = {
    getHandler: () => undefined,
    getClass: () => undefined,
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
  return { guard: new RolesGuard(reflector), context };
}

describe('RolesGuard', () => {
  it('deja pasar a cualquier usuario autenticado si la ruta no tiene @Roles', () => {
    const { guard, context } = makeContext(
      { id: 'u1', nombre: 'Ana', correo: 'ana@correo.com', rol: Rol.Aspirante },
      undefined,
    );
    expect(guard.canActivate(context)).toBe(true);
  });

  it('permite el acceso si el rol del usuario está en la lista requerida', () => {
    const { guard, context } = makeContext(
      { id: 'u1', nombre: 'Ana', correo: 'ana@correo.com', rol: Rol.Superadmin },
      [Rol.Superadmin, Rol.AdminAcademico],
    );
    expect(guard.canActivate(context)).toBe(true);
  });

  it('rechaza con ForbiddenException si el rol del usuario no está autorizado', () => {
    const { guard, context } = makeContext(
      { id: 'u1', nombre: 'Ana', correo: 'ana@correo.com', rol: Rol.Estudiante },
      [Rol.Superadmin, Rol.AdminAcademico],
    );
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('rechaza si la ruta requiere roles pero no hay usuario en la petición', () => {
    const { guard, context } = makeContext(undefined, [Rol.Superadmin]);
    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });
});
