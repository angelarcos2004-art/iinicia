import { UnauthorizedException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { Rol } from '../users/rol.enum.js';
import type { User } from '../users/user.entity.js';
import type { UsersService } from '../users/users.service.js';
import { JwtStrategy } from './jwt.strategy.js';

function makeStrategy(user: User | null) {
  const config = { getOrThrow: () => 'test-secret' } as unknown as ConfigService;
  const users = { findById: vi.fn().mockResolvedValue(user) };
  return { strategy: new JwtStrategy(config, users as unknown as UsersService), users };
}

describe('JwtStrategy', () => {
  it('devuelve id, nombre, correo y rol frescos de la base de datos', async () => {
    const { strategy, users } = makeStrategy({
      id: 'u1',
      nombre: 'Ana',
      correo: 'ana@correo.com',
      rol: Rol.Profesor, // el rol cambió respecto al del token
      passwordHash: 'secreto',
    } as User);

    const result = await strategy.validate({ sub: 'u1', rol: Rol.Aspirante });

    expect(users.findById).toHaveBeenCalledWith('u1');
    expect(result).toEqual({
      id: 'u1',
      nombre: 'Ana',
      correo: 'ana@correo.com',
      rol: Rol.Profesor,
    });
    expect(result).not.toHaveProperty('passwordHash');
  });

  it('rechaza el token si el usuario ya no existe', async () => {
    const { strategy } = makeStrategy(null);
    await expect(strategy.validate({ sub: 'x', rol: Rol.Aspirante })).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
