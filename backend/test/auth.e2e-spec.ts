import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { setupApp } from '../src/app.setup.js';
import { AuthController } from '../src/auth/auth.controller.js';
import { AuthService } from '../src/auth/auth.service.js';
import { JwtStrategy } from '../src/auth/jwt.strategy.js';
import { MailService } from '../src/mail/mail.service.js';
import { MoodleService } from '../src/moodle/moodle.service.js';
import { Rol } from '../src/users/rol.enum.js';
import type { User } from '../src/users/user.entity.js';
import { UsersService } from '../src/users/users.service.js';

/** UsersService en memoria: las pruebas no requieren PostgreSQL. */
class InMemoryUsers {
  items: User[] = [];
  async findByCorreo(correo: string) {
    return this.items.find((u) => u.correo === correo.trim().toLowerCase()) ?? null;
  }
  async findById(id: string) {
    return this.items.find((u) => u.id === id) ?? null;
  }
  async create(data: Partial<User> & { nombre: string; correo: string; passwordHash: string }) {
    const user = {
      id: crypto.randomUUID(),
      moodleUserId: null,
      rol: Rol.Aspirante,
      ...data,
      correo: data.correo.trim().toLowerCase(),
    } as User;
    this.items.push(user);
    return user;
  }
  async actualizarMoodleUserId(id: string, moodleUserId: number) {
    const user = this.items.find((u) => u.id === id);
    if (user) user.moodleUserId = moodleUserId;
  }
  async guardarTokenRecuperacion(id: string, tokenHash: string, expira: Date) {
    const user = this.items.find((u) => u.id === id);
    if (user) {
      user.resetPasswordTokenHash = tokenHash;
      user.resetPasswordExpira = expira;
    }
  }
  async limpiarTokenRecuperacion(id: string) {
    const user = this.items.find((u) => u.id === id);
    if (user) {
      user.resetPasswordTokenHash = null;
      user.resetPasswordExpira = null;
    }
  }
  async actualizarPasswordHash(id: string, passwordHash: string) {
    const user = this.items.find((u) => u.id === id);
    if (user) user.passwordHash = passwordHash;
  }
}

/** MoodleService falso: estas pruebas no deben depender de un Moodle real. */
const moodleFake = {
  buscarOCrearUsuarioMoodle: vi.fn().mockResolvedValue(555),
  matricularEnCurso: vi.fn().mockResolvedValue(undefined),
};

/** MailService falso: captura el enlace en vez de intentar enviar un correo real. */
const mailFake = {
  enviarRecuperacion: vi.fn().mockResolvedValue(undefined),
};

const registroValido = {
  nombreCompleto: 'Ana Pérez',
  correo: 'Ana@Correo.com',
  password: 'secreto123',
  programaInteresId: 'lic-psicologia',
  aceptaAvisoPrivacidad: true,
  deseaInformacionBecas: false,
};

describe('Auth (e2e)', () => {
  let app: INestApplication;
  let jwt: JwtService;

  beforeEach(async () => {
    moodleFake.buscarOCrearUsuarioMoodle.mockClear();
    moodleFake.matricularEnCurso.mockClear();
    mailFake.enviarRecuperacion.mockClear();
    const moduleRef = await Test.createTestingModule({
      imports: [JwtModule.register({ secret: 'test-secret', signOptions: { expiresIn: '1h' } })],
      controllers: [AuthController],
      providers: [
        AuthService,
        JwtStrategy,
        { provide: UsersService, useClass: InMemoryUsers },
        { provide: MoodleService, useValue: moodleFake },
        { provide: MailService, useValue: mailFake },
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: () => 'test-secret',
            get: (_key: string, def?: string) => def,
          },
        },
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    setupApp(app, 'http://localhost:3000');
    await app.init();
    jwt = moduleRef.get(JwtService);
  });

  afterEach(() => app.close());

  it('POST /auth/registro crea aspirante y devuelve token + usuario', async () => {
    const res = await request(app.getHttpServer()).post('/auth/registro').send(registroValido);
    expect(res.status).toBe(200);
    expect(res.body.usuario).toEqual({
      id: expect.any(String),
      nombre: 'Ana Pérez',
      correo: 'ana@correo.com',
      rol: 'aspirante',
    });
    expect(res.body.usuario.passwordHash).toBeUndefined();
    const payload = await jwt.verifyAsync(res.body.token);
    expect(payload.sub).toBe(res.body.usuario.id);
  });

  it('POST /auth/registro vincula al usuario con Moodle (idempotente)', async () => {
    await request(app.getHttpServer()).post('/auth/registro').send(registroValido);
    expect(moodleFake.buscarOCrearUsuarioMoodle).toHaveBeenCalledWith('ana@correo.com', 'Ana Pérez');

    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ correo: 'ana@correo.com', password: 'secreto123' });
    expect(res.status).toBe(200);
    // Ya tenia moodleUserId desde el registro: el login no vuelve a llamar a Moodle.
    expect(moodleFake.buscarOCrearUsuarioMoodle).toHaveBeenCalledTimes(1);
  });

  it('POST /auth/registro con correo duplicado -> 400 { message }', async () => {
    await request(app.getHttpServer()).post('/auth/registro').send(registroValido);
    const res = await request(app.getHttpServer()).post('/auth/registro').send(registroValido);
    expect(res.status).toBe(400);
    expect(typeof res.body.message).toBe('string');
    expect(Object.keys(res.body)).toEqual(['message']);
  });

  it('POST /auth/registro con datos inválidos -> 400 { message }', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/registro')
      .send({ ...registroValido, password: '123', aceptaAvisoPrivacidad: false });
    expect(res.status).toBe(400);
    expect(typeof res.body.message).toBe('string');
  });

  it('POST /auth/login correcto -> 200 con token y usuario', async () => {
    await request(app.getHttpServer()).post('/auth/registro').send(registroValido);
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ correo: 'ANA@correo.com', password: 'secreto123' });
    expect(res.status).toBe(200);
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.usuario.rol).toBe('aspirante');
  });

  it('POST /auth/login con contraseña incorrecta -> 401 { message }', async () => {
    await request(app.getHttpServer()).post('/auth/registro').send(registroValido);
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ correo: 'ana@correo.com', password: 'mala' });
    expect(res.status).toBe(401);
    expect(typeof res.body.message).toBe('string');
  });

  it('POST /auth/login con usuario inexistente -> 401 { message }', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ correo: 'nadie@correo.com', password: 'x' });
    expect(res.status).toBe(401);
    expect(typeof res.body.message).toBe('string');
  });

  describe('GET /auth/me', () => {
    it('con token válido devuelve { id, nombre, correo, rol } del usuario', async () => {
      const reg = await request(app.getHttpServer()).post('/auth/registro').send(registroValido);

      const res = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${reg.body.token}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        id: reg.body.usuario.id,
        nombre: 'Ana Pérez',
        correo: 'ana@correo.com',
        rol: 'aspirante',
      });
      expect(res.body.passwordHash).toBeUndefined();
    });

    it('sin header Authorization -> 401 { message }', async () => {
      const res = await request(app.getHttpServer()).get('/auth/me');
      expect(res.status).toBe(401);
      expect(Object.keys(res.body)).toEqual(['message']);
      expect(typeof res.body.message).toBe('string');
    });

    it('con token basura -> 401 { message }', async () => {
      const res = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', 'Bearer esto.no.es-un-jwt');
      expect(res.status).toBe(401);
      expect(typeof res.body.message).toBe('string');
    });

    it('con esquema distinto a Bearer -> 401', async () => {
      const reg = await request(app.getHttpServer()).post('/auth/registro').send(registroValido);
      const res = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Basic ${reg.body.token}`);
      expect(res.status).toBe(401);
    });

    it('con token firmado con otro secreto -> 401', async () => {
      const reg = await request(app.getHttpServer()).post('/auth/registro').send(registroValido);
      const falso = await new JwtService({ secret: 'otro-secreto' }).signAsync({
        sub: reg.body.usuario.id,
        rol: 'superadmin',
      });
      const res = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${falso}`);
      expect(res.status).toBe(401);
      expect(typeof res.body.message).toBe('string');
    });

    it('con token expirado -> 401 { message }', async () => {
      const reg = await request(app.getHttpServer()).post('/auth/registro').send(registroValido);
      const expirado = await jwt.signAsync(
        { sub: reg.body.usuario.id, rol: 'aspirante' },
        { expiresIn: -10 },
      );
      const res = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${expirado}`);
      expect(res.status).toBe(401);
      expect(typeof res.body.message).toBe('string');
    });

    it('con token válido de un usuario que ya no existe -> 401', async () => {
      const huerfano = await jwt.signAsync({ sub: crypto.randomUUID(), rol: 'aspirante' });
      const res = await request(app.getHttpServer())
        .get('/auth/me')
        .set('Authorization', `Bearer ${huerfano}`);
      expect(res.status).toBe(401);
      expect(typeof res.body.message).toBe('string');
    });
  });

  it('ruta inexistente -> { message }', async () => {
    const res = await request(app.getHttpServer()).get('/nada');
    expect(res.status).toBe(404);
    expect(typeof res.body.message).toBe('string');
  });

  describe('Recuperación de contraseña', () => {
    /** Extrae el token del enlace que MailService.enviarRecuperacion recibió. */
    function tokenDelUltimoEnlace(): string {
      const enlace = mailFake.enviarRecuperacion.mock.calls.at(-1)?.[1] as string;
      return new URL(enlace).searchParams.get('token')!;
    }

    it('POST /auth/recuperar con correo existente envía el enlace y responde con mensaje genérico', async () => {
      await request(app.getHttpServer()).post('/auth/registro').send(registroValido);
      const res = await request(app.getHttpServer())
        .post('/auth/recuperar')
        .send({ correo: 'ana@correo.com' });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ mensaje: expect.any(String) });
      expect(mailFake.enviarRecuperacion).toHaveBeenCalledWith('ana@correo.com', expect.any(String));
    });

    it('POST /auth/recuperar con correo inexistente responde igual, sin enviar nada', async () => {
      const res = await request(app.getHttpServer())
        .post('/auth/recuperar')
        .send({ correo: 'nadie@correo.com' });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ mensaje: expect.any(String) });
      expect(mailFake.enviarRecuperacion).not.toHaveBeenCalled();
    });

    it('POST /auth/recuperar con correo inválido -> 400', async () => {
      const res = await request(app.getHttpServer()).post('/auth/recuperar').send({ correo: 'no-es-correo' });
      expect(res.status).toBe(400);
    });

    it('flujo completo: recuperar -> restablecer -> login con la nueva contraseña', async () => {
      await request(app.getHttpServer()).post('/auth/registro').send(registroValido);
      await request(app.getHttpServer()).post('/auth/recuperar').send({ correo: 'ana@correo.com' });
      const token = tokenDelUltimoEnlace();

      const restablecer = await request(app.getHttpServer()).post('/auth/restablecer').send({
        correo: 'ana@correo.com',
        token,
        nuevaPassword: 'NuevaSegura123',
      });
      expect(restablecer.status).toBe(200);

      const loginViejo = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ correo: 'ana@correo.com', password: 'secreto123' });
      expect(loginViejo.status).toBe(401);

      const loginNuevo = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ correo: 'ana@correo.com', password: 'NuevaSegura123' });
      expect(loginNuevo.status).toBe(200);
    });

    it('el token de recuperación no sirve dos veces', async () => {
      await request(app.getHttpServer()).post('/auth/registro').send(registroValido);
      await request(app.getHttpServer()).post('/auth/recuperar').send({ correo: 'ana@correo.com' });
      const token = tokenDelUltimoEnlace();

      await request(app.getHttpServer()).post('/auth/restablecer').send({
        correo: 'ana@correo.com',
        token,
        nuevaPassword: 'NuevaSegura123',
      });
      const segundoIntento = await request(app.getHttpServer()).post('/auth/restablecer').send({
        correo: 'ana@correo.com',
        token,
        nuevaPassword: 'OtraSegura456',
      });
      expect(segundoIntento.status).toBe(400);
    });

    it('POST /auth/restablecer con token incorrecto -> 400 { message }', async () => {
      await request(app.getHttpServer()).post('/auth/registro').send(registroValido);
      await request(app.getHttpServer()).post('/auth/recuperar').send({ correo: 'ana@correo.com' });

      const res = await request(app.getHttpServer()).post('/auth/restablecer').send({
        correo: 'ana@correo.com',
        token: 'token-que-no-es',
        nuevaPassword: 'NuevaSegura123',
      });
      expect(res.status).toBe(400);
      expect(typeof res.body.message).toBe('string');
    });

    it('POST /auth/restablecer con contraseña demasiado corta -> 400', async () => {
      await request(app.getHttpServer()).post('/auth/registro').send(registroValido);
      await request(app.getHttpServer()).post('/auth/recuperar').send({ correo: 'ana@correo.com' });
      const token = tokenDelUltimoEnlace();

      const res = await request(app.getHttpServer()).post('/auth/restablecer').send({
        correo: 'ana@correo.com',
        token,
        nuevaPassword: '123',
      });
      expect(res.status).toBe(400);
    });
  });
});
