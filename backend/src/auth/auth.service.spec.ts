import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import { AuthService } from './auth.service.js';
import type { MailService } from '../mail/mail.service.js';
import { Rol } from '../users/rol.enum.js';
import type { User } from '../users/user.entity.js';
import type { UsersService } from '../users/users.service.js';

function makeService(existing: User | null, env: Record<string, string> = {}) {
  const users = {
    findByCorreo: vi.fn().mockResolvedValue(existing),
    create: vi.fn(async (d: Record<string, unknown>) => ({ id: 'uuid-1', moodleUserId: null, ...d }) as unknown as User),
    guardarTokenRecuperacion: vi.fn().mockResolvedValue(undefined),
    limpiarTokenRecuperacion: vi.fn().mockResolvedValue(undefined),
    actualizarPasswordHash: vi.fn().mockResolvedValue(undefined),
    guardarCodigo2FA: vi.fn().mockResolvedValue(undefined),
    limpiarCodigo2FA: vi.fn().mockResolvedValue(undefined),
  };
  const jwt = { signAsync: vi.fn().mockResolvedValue('tok') } as unknown as JwtService;
  const config = {
    get: (key: string, def?: string) => env[key] ?? def,
    getOrThrow: (key: string) => {
      if (env[key] === undefined) throw new Error(`falta ${key} en el entorno de prueba`);
      return env[key];
    },
  } as unknown as ConfigService;
  const mail = {
    enviarRecuperacion: vi.fn().mockResolvedValue(undefined),
    enviarCodigo2FA: vi.fn().mockResolvedValue(undefined),
  };
  return {
    service: new AuthService(users as unknown as UsersService, jwt, config, mail as unknown as MailService),
    users,
    jwt,
    mail,
  };
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

  it('login correcto no entrega el token todavía: genera y envía el código 2FA', async () => {
    const hash = await bcrypt.hash('buena', 4);
    const { service, users, mail } = makeService({
      id: 'u',
      correo: 'a@b.com',
      nombre: 'Ana',
      passwordHash: hash,
      rol: Rol.Aspirante,
    } as User);
    const res = await service.login({ correo: 'a@b.com', password: 'buena' });

    expect(res.correo).toBe('a@b.com');
    expect(users.guardarCodigo2FA).toHaveBeenCalledTimes(1);
    const [id, codigoHash, expira] = users.guardarCodigo2FA.mock.calls[0];
    expect(id).toBe('u');
    expect(typeof codigoHash).toBe('string');
    expect(expira.getTime()).toBeGreaterThan(Date.now());

    expect(mail.enviarCodigo2FA).toHaveBeenCalledTimes(1);
    const [correoDestino, codigo] = mail.enviarCodigo2FA.mock.calls[0];
    expect(correoDestino).toBe('a@b.com');
    expect(codigo).toMatch(/^\d{6}$/);
    expect(await bcrypt.compare(codigo, codigoHash)).toBe(true);
  });

  describe('verificar2FA', () => {
    async function makeServiceConCodigoVigente(codigo: string, expiraEnMs = 5 * 60 * 1000) {
      const codigoHash = await bcrypt.hash(codigo, 4);
      return makeService({
        id: 'u',
        correo: 'a@b.com',
        nombre: 'Ana',
        rol: Rol.Aspirante,
        twoFactorCodeHash: codigoHash,
        twoFactorCodeExpira: new Date(Date.now() + expiraEnMs),
      } as User);
    }

    it('con código correcto, devuelve token y usuario, y limpia el código', async () => {
      const { service, users } = await makeServiceConCodigoVigente('123456');
      const res = await service.verificar2FA({ correo: 'a@b.com', codigo: '123456' });

      expect(res.token).toBe('tok');
      expect(res.usuario.rol).toBe(Rol.Aspirante);
      expect(users.limpiarCodigo2FA).toHaveBeenCalledWith('u');
    });

    it('rechaza un código que no coincide', async () => {
      const { service } = await makeServiceConCodigoVigente('123456');
      await expect(
        service.verificar2FA({ correo: 'a@b.com', codigo: '000000' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rechaza un código ya vencido', async () => {
      const { service } = await makeServiceConCodigoVigente('123456', -1000);
      await expect(
        service.verificar2FA({ correo: 'a@b.com', codigo: '123456' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rechaza si el correo no existe', async () => {
      const { service } = makeService(null);
      await expect(
        service.verificar2FA({ correo: 'no-existe@b.com', codigo: '123456' }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });

  describe('recuperar', () => {
    it('si el correo existe, guarda un hash del token y envía el enlace por correo', async () => {
      const { service, users, mail } = makeService({ id: 'u', correo: 'a@b.com' } as User);
      await service.recuperar('a@b.com');

      expect(users.guardarTokenRecuperacion).toHaveBeenCalledTimes(1);
      const [id, tokenHash, expira] = users.guardarTokenRecuperacion.mock.calls[0];
      expect(id).toBe('u');
      expect(typeof tokenHash).toBe('string');
      expect(expira.getTime()).toBeGreaterThan(Date.now());

      expect(mail.enviarRecuperacion).toHaveBeenCalledTimes(1);
      const [correoDestino, enlace] = mail.enviarRecuperacion.mock.calls[0];
      expect(correoDestino).toBe('a@b.com');
      expect(enlace).toContain('/restablecer?correo=a%40b.com&token=');
    });

    it('si el correo NO existe, no guarda token ni envía correo (pero no lanza)', async () => {
      const { service, users, mail } = makeService(null);
      await expect(service.recuperar('no-existe@b.com')).resolves.toBeUndefined();
      expect(users.guardarTokenRecuperacion).not.toHaveBeenCalled();
      expect(mail.enviarRecuperacion).not.toHaveBeenCalled();
    });
  });

  describe('restablecer', () => {
    async function makeServiceConTokenVigente(tokenCrudo: string, expiraEnMs = 60 * 60 * 1000) {
      const tokenHash = await bcrypt.hash(tokenCrudo, 4);
      return makeService({
        id: 'u',
        correo: 'a@b.com',
        resetPasswordTokenHash: tokenHash,
        resetPasswordExpira: new Date(Date.now() + expiraEnMs),
      } as User);
    }

    it('con token y correo correctos, actualiza la contraseña y limpia el token', async () => {
      const { service, users } = await makeServiceConTokenVigente('token-valido');
      await service.restablecer({
        correo: 'a@b.com',
        token: 'token-valido',
        nuevaPassword: 'NuevaSegura123',
      });

      expect(users.actualizarPasswordHash).toHaveBeenCalledTimes(1);
      const [id, passwordHash] = users.actualizarPasswordHash.mock.calls[0];
      expect(id).toBe('u');
      expect(await bcrypt.compare('NuevaSegura123', passwordHash)).toBe(true);
      expect(users.limpiarTokenRecuperacion).toHaveBeenCalledWith('u');
    });

    it('rechaza un token que no coincide', async () => {
      const { service, users } = await makeServiceConTokenVigente('token-valido');
      await expect(
        service.restablecer({ correo: 'a@b.com', token: 'token-incorrecto', nuevaPassword: 'NuevaSegura123' }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(users.actualizarPasswordHash).not.toHaveBeenCalled();
    });

    it('rechaza un token ya vencido', async () => {
      const { service, users } = await makeServiceConTokenVigente('token-valido', -1000);
      await expect(
        service.restablecer({ correo: 'a@b.com', token: 'token-valido', nuevaPassword: 'NuevaSegura123' }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(users.actualizarPasswordHash).not.toHaveBeenCalled();
    });

    it('rechaza si el usuario nunca pidió recuperación (sin token guardado)', async () => {
      const { service, users } = makeService({ id: 'u', correo: 'a@b.com' } as User);
      await expect(
        service.restablecer({ correo: 'a@b.com', token: 'cualquiera', nuevaPassword: 'NuevaSegura123' }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(users.actualizarPasswordHash).not.toHaveBeenCalled();
    });

    it('rechaza si el correo no existe', async () => {
      const { service } = makeService(null);
      await expect(
        service.restablecer({ correo: 'no-existe@b.com', token: 'x', nuevaPassword: 'NuevaSegura123' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});
