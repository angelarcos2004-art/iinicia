import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcryptjs';
import { AuthService } from './auth.service.js';
import type { MailService } from '../mail/mail.service.js';
import type { MoodleService } from '../moodle/moodle.service.js';
import type { ProgramasService } from '../programas/programas.service.js';
import { Rol } from '../users/rol.enum.js';
import type { User } from '../users/user.entity.js';
import type { UsersService } from '../users/users.service.js';

function makeService(
  existing: User | null,
  moodleUserId = 99,
  env: Record<string, string> = {},
) {
  const users = {
    findByCorreo: vi.fn().mockResolvedValue(existing),
    create: vi.fn(async (d: Record<string, unknown>) => ({ id: 'uuid-1', moodleUserId: null, ...d }) as unknown as User),
    actualizarMoodleUserId: vi.fn().mockResolvedValue(undefined),
    guardarTokenRecuperacion: vi.fn().mockResolvedValue(undefined),
    limpiarTokenRecuperacion: vi.fn().mockResolvedValue(undefined),
    actualizarPasswordHash: vi.fn().mockResolvedValue(undefined),
  };
  const jwt = { signAsync: vi.fn().mockResolvedValue('tok') } as unknown as JwtService;
  const moodle = {
    buscarOCrearUsuarioMoodle: vi.fn().mockResolvedValue(moodleUserId),
    matricularEnCurso: vi.fn().mockResolvedValue(undefined),
  } as unknown as MoodleService;
  const config = {
    get: (key: string, def?: string) => env[key] ?? def,
  } as unknown as ConfigService;
  const mail = { enviarRecuperacion: vi.fn().mockResolvedValue(undefined) };
  const programas = { obtenerMoodleCourseShortname: vi.fn().mockResolvedValue(null) };
  return {
    service: new AuthService(
      users as unknown as UsersService,
      jwt,
      moodle,
      config,
      mail as unknown as MailService,
      programas as unknown as ProgramasService,
    ),
    users,
    jwt,
    moodle,
    mail,
    programas,
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

  it('registro vincula al usuario con Moodle (idempotente) y guarda el id', async () => {
    const { service, users, moodle } = makeService(null, 42);
    await service.registro({
      nombreCompleto: 'Ana Pérez',
      correo: 'ana@b.com',
      password: 'secreto123',
      programaInteresId: 'p1',
      aceptaAvisoPrivacidad: true,
      deseaInformacionBecas: false,
    });
    expect(moodle.buscarOCrearUsuarioMoodle).toHaveBeenCalledWith('ana@b.com', 'Ana Pérez');
    expect(users.actualizarMoodleUserId).toHaveBeenCalledWith('uuid-1', 42);
  });

  it('si Moodle falla, el registro de todos modos se completa (no bloquea)', async () => {
    const { service, users, moodle } = makeService(null);
    (moodle.buscarOCrearUsuarioMoodle as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('Moodle caído'),
    );
    const res = await service.registro({
      nombreCompleto: 'Ana',
      correo: 'a@b.com',
      password: 'secreto123',
      programaInteresId: 'p1',
      aceptaAvisoPrivacidad: true,
      deseaInformacionBecas: false,
    });
    expect(res.usuario.rol).toBe(Rol.Aspirante);
    expect(users.actualizarMoodleUserId).not.toHaveBeenCalled();
  });

  it('login reintenta vincular Moodle si el usuario aún no tenía moodleUserId', async () => {
    const hash = await bcrypt.hash('buena', 4);
    const { service, users, moodle } = makeService(
      {
        id: 'u',
        correo: 'a@b.com',
        nombre: 'Ana',
        passwordHash: hash,
        moodleUserId: null,
        rol: Rol.Estudiante,
      } as User,
      55,
    );
    await service.login({ correo: 'a@b.com', password: 'buena' });
    expect(moodle.buscarOCrearUsuarioMoodle).toHaveBeenCalledWith('a@b.com', 'Ana');
    expect(users.actualizarMoodleUserId).toHaveBeenCalledWith('u', 55);
  });

  it('login NO intenta vincular Moodle si el usuario ya tenía moodleUserId', async () => {
    const hash = await bcrypt.hash('buena', 4);
    const { service, moodle } = makeService(
      { id: 'u', correo: 'a@b.com', nombre: 'Ana', passwordHash: hash, moodleUserId: 7 } as User,
    );
    await service.login({ correo: 'a@b.com', password: 'buena' });
    expect(moodle.buscarOCrearUsuarioMoodle).not.toHaveBeenCalled();
  });

  it('login NO vincula a Moodle cuentas de staff (nunca deben matricularse como estudiante)', async () => {
    const hash = await bcrypt.hash('buena', 4);
    const { service, moodle } = makeService(
      {
        id: 'u',
        correo: 'a@b.com',
        nombre: 'Ana',
        passwordHash: hash,
        moodleUserId: null,
        rol: Rol.Profesor,
      } as User,
      55,
    );
    await service.login({ correo: 'a@b.com', password: 'buena' });
    expect(moodle.buscarOCrearUsuarioMoodle).not.toHaveBeenCalled();
  });

  describe('matrícula en el curso de prueba', () => {
    const dto = {
      nombreCompleto: 'Ana',
      correo: 'a@b.com',
      password: 'secreto123',
      programaInteresId: 'p1',
      aceptaAvisoPrivacidad: true,
      deseaInformacionBecas: false,
    };

    it('registro exitoso matricula al usuario Moodle en IINICIA101 (default)', async () => {
      const { service, moodle } = makeService(null, 42);
      await service.registro(dto);
      expect(moodle.matricularEnCurso).toHaveBeenCalledWith(42, 'IINICIA101');
    });

    it('usa MOODLE_TEST_COURSE si está definida', async () => {
      const { service, moodle } = makeService(null, 42, { MOODLE_TEST_COURSE: 'OTRO101' });
      await service.registro(dto);
      expect(moodle.matricularEnCurso).toHaveBeenCalledWith(42, 'OTRO101');
    });

    it('si el programa de interés tiene un curso de Moodle asignado, matricula ahí (no en el default)', async () => {
      const { service, moodle, programas } = makeService(null, 42);
      programas.obtenerMoodleCourseShortname.mockResolvedValue('LIC-SOFTWARE-IA');
      await service.registro(dto);
      expect(programas.obtenerMoodleCourseShortname).toHaveBeenCalledWith('p1');
      expect(moodle.matricularEnCurso).toHaveBeenCalledWith(42, 'LIC-SOFTWARE-IA');
    });

    it('si matricularEnCurso falla, el registro igual se completa y el id Moodle se conserva', async () => {
      const { service, users, moodle } = makeService(null, 42);
      (moodle.matricularEnCurso as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('curso inexistente'),
      );
      const res = await service.registro(dto);
      expect(res.token).toBe('tok');
      expect(users.actualizarMoodleUserId).toHaveBeenCalledWith('uuid-1', 42);
    });

    it('si no se pudo vincular al usuario, no intenta matricular', async () => {
      const { service, moodle } = makeService(null);
      (moodle.buscarOCrearUsuarioMoodle as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('Moodle caído'),
      );
      await service.registro(dto);
      expect(moodle.matricularEnCurso).not.toHaveBeenCalled();
    });

    it('login que reintenta la vinculación también matricula', async () => {
      const hash = await bcrypt.hash('buena', 4);
      const { service, moodle } = makeService(
        {
          id: 'u',
          correo: 'a@b.com',
          nombre: 'Ana',
          passwordHash: hash,
          moodleUserId: null,
          rol: Rol.Estudiante,
        } as User,
        55,
      );
      await service.login({ correo: 'a@b.com', password: 'buena' });
      expect(moodle.matricularEnCurso).toHaveBeenCalledWith(55, 'IINICIA101');
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
