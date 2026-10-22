import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import { AuthService } from './auth.service.js';
import { Rol } from '../users/rol.enum.js';
import type { User } from '../users/user.entity.js';
import type { UsersService } from '../users/users.service.js';

function makeService(existing: User | null) {
  const users = {
    findByCorreo: vi.fn().mockResolvedValue(existing),
    create: vi.fn(async (d: Record<string, unknown>) => ({ id: 'uuid-1', moodleUserId: null, ...d }) as unknown as User),
  };
  const jwt = { signAsync: vi.fn().mockResolvedValue('tok') } as unknown as JwtService;
  return { service: new AuthService(users as unknown as UsersService, jwt), users, jwt };
}

describe('AuthService', () => {
  it('registro guarda hash bcrypt (no la contraseña) y rol aspirante', async () => {
    const { service, users } = makeService(null);
    const res = await service.registro({
      nombreCompleto: 'Ana',
      correo: 'a@b.com',
      password: 'secreto123',
      programaInteresId: 'p1',
      aceptaAvisoPrivacidad: true,
      deseaInformacionBecas: true,
    });
    const arg = users.create.mock.calls[0][0] as { passwordHash: string; rol: Rol };
    expect(arg.passwordHash).not.toBe('secreto123');
    expect(await bcrypt.compare('secreto123', arg.passwordHash)).toBe(true);
    expect(res.usuario.rol).toBe(Rol.Aspirante);
    expect(res.token).toBe('tok');
  });

  it('registro rechaza correo duplicado', async () => {
    const { service } = makeService({ id: 'x' } as User);
    await expect(
      service.registro({
        nombreCompleto: 'Ana',
        correo: 'a@b.com',
        password: 'secreto123',
        programaInteresId: 'p1',
        aceptaAvisoPrivacidad: true,
        deseaInformacionBecas: false,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('login rechaza contraseña incorrecta', async () => {
    const hash = await bcrypt.hash('buena', 4);
    const { service } = makeService({ id: 'u', passwordHash: hash } as User);
    await expect(service.login({ correo: 'a@b.com', password: 'mala' })).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
