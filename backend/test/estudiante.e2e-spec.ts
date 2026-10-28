import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { setupApp } from '../src/app.setup.js';
import { JwtAuthGuard } from '../src/auth/jwt-auth.guard.js';
import { JwtStrategy } from '../src/auth/jwt.strategy.js';
import { EstudianteController } from '../src/estudiante/estudiante.controller.js';
import { MoodleService } from '../src/moodle/moodle.service.js';
import { Rol } from '../src/users/rol.enum.js';
import type { User } from '../src/users/user.entity.js';
import { UsersService } from '../src/users/users.service.js';

class InMemoryUsers {
  items: User[] = [
    {
      id: 'u-con-moodle',
      nombre: 'Con Moodle',
      correo: 'con-moodle@correo.com',
      passwordHash: 'x',
      rol: Rol.Estudiante,
      moodleUserId: 17,
    } as User,
    {
      id: 'u-sin-moodle',
      nombre: 'Sin Moodle',
      correo: 'sin-moodle@correo.com',
      passwordHash: 'x',
      rol: Rol.Aspirante,
      moodleUserId: null,
    } as User,
  ];
  async findById(id: string) {
    return this.items.find((u) => u.id === id) ?? null;
  }
  async actualizarFcmToken(id: string, fcmToken: string) {
    const user = this.items.find((u) => u.id === id);
    if (user) user.fcmToken = fcmToken;
  }
}

const moodleFake = {
  obtenerCursosDeUsuario: vi.fn(),
  obtenerActividadesProximas: vi.fn(),
  solicitarUrlAutologin: vi.fn(),
};

describe('GET /estudiante/cursos (e2e)', () => {
  let app: INestApplication;
  let jwt: JwtService;

  beforeEach(async () => {
    moodleFake.obtenerCursosDeUsuario.mockReset();
    moodleFake.obtenerActividadesProximas.mockReset();
    moodleFake.solicitarUrlAutologin.mockReset();
    const moduleRef = await Test.createTestingModule({
      imports: [JwtModule.register({ secret: 'test-secret', signOptions: { expiresIn: '1h' } })],
      controllers: [EstudianteController],
      providers: [
        JwtStrategy,
        JwtAuthGuard,
        { provide: UsersService, useClass: InMemoryUsers },
        { provide: MoodleService, useValue: moodleFake },
        { provide: ConfigService, useValue: { getOrThrow: () => 'test-secret' } },
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    setupApp(app, 'http://localhost:3000');
    await app.init();
    jwt = moduleRef.get(JwtService);
  });

  afterEach(() => app.close());

  it('devuelve los cursos reales del usuario vinculado a Moodle', async () => {
    moodleFake.obtenerCursosDeUsuario.mockResolvedValue([
      { id: 2, shortname: 'IINICIA101', fullname: 'Test course: XS', progress: null },
    ]);
    const token = await jwt.signAsync({ sub: 'u-con-moodle', rol: Rol.Estudiante });

    const res = await request(app.getHttpServer())
      .get('/estudiante/cursos')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      { id: 2, nombre: 'Test course: XS', shortname: 'IINICIA101', progreso: null },
    ]);
    expect(moodleFake.obtenerCursosDeUsuario).toHaveBeenCalledWith(17);
  });

  it('devuelve lista vacía (sin llamar a Moodle) si el usuario no tiene moodleUserId', async () => {
    const token = await jwt.signAsync({ sub: 'u-sin-moodle', rol: Rol.Aspirante });

    const res = await request(app.getHttpServer())
      .get('/estudiante/cursos')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
    expect(moodleFake.obtenerCursosDeUsuario).not.toHaveBeenCalled();
  });

  it('sin token -> 401 { message }', async () => {
    const res = await request(app.getHttpServer()).get('/estudiante/cursos');
    expect(res.status).toBe(401);
    expect(typeof res.body.message).toBe('string');
  });
});

describe('GET /estudiante/actividades (e2e)', () => {
  let app: INestApplication;
  let jwt: JwtService;

  beforeEach(async () => {
    moodleFake.obtenerCursosDeUsuario.mockReset();
    moodleFake.obtenerActividadesProximas.mockReset();
    moodleFake.solicitarUrlAutologin.mockReset();
    const moduleRef = await Test.createTestingModule({
      imports: [JwtModule.register({ secret: 'test-secret', signOptions: { expiresIn: '1h' } })],
      controllers: [EstudianteController],
      providers: [
        JwtStrategy,
        JwtAuthGuard,
        { provide: UsersService, useClass: InMemoryUsers },
        { provide: MoodleService, useValue: moodleFake },
        { provide: ConfigService, useValue: { getOrThrow: () => 'test-secret' } },
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    setupApp(app, 'http://localhost:3000');
    await app.init();
    jwt = moduleRef.get(JwtService);
  });

  afterEach(() => app.close());

  it('devuelve las próximas actividades del usuario vinculado a Moodle', async () => {
    moodleFake.obtenerActividadesProximas.mockResolvedValue([
      { id: 5, titulo: 'Entrega Tarea 1', curso: 'Test course: XS', fecha: '2026-11-01T00:00:00.000Z', url: null },
    ]);
    const token = await jwt.signAsync({ sub: 'u-con-moodle', rol: Rol.Estudiante });

    const res = await request(app.getHttpServer())
      .get('/estudiante/actividades')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      { id: 5, titulo: 'Entrega Tarea 1', curso: 'Test course: XS', fecha: '2026-11-01T00:00:00.000Z', url: null },
    ]);
    expect(moodleFake.obtenerActividadesProximas).toHaveBeenCalledWith(17);
  });

  it('devuelve lista vacía (sin llamar a Moodle) si el usuario no tiene moodleUserId', async () => {
    const token = await jwt.signAsync({ sub: 'u-sin-moodle', rol: Rol.Aspirante });

    const res = await request(app.getHttpServer())
      .get('/estudiante/actividades')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
    expect(moodleFake.obtenerActividadesProximas).not.toHaveBeenCalled();
  });

  it('sin token -> 401', async () => {
    const res = await request(app.getHttpServer()).get('/estudiante/actividades');
    expect(res.status).toBe(401);
  });
});

describe('GET /estudiante/moodle-sso (e2e)', () => {
  let app: INestApplication;
  let jwt: JwtService;

  beforeEach(async () => {
    moodleFake.obtenerCursosDeUsuario.mockReset();
    moodleFake.obtenerActividadesProximas.mockReset();
    moodleFake.solicitarUrlAutologin.mockReset();
    const moduleRef = await Test.createTestingModule({
      imports: [JwtModule.register({ secret: 'test-secret', signOptions: { expiresIn: '1h' } })],
      controllers: [EstudianteController],
      providers: [
        JwtStrategy,
        JwtAuthGuard,
        { provide: UsersService, useClass: InMemoryUsers },
        { provide: MoodleService, useValue: moodleFake },
        { provide: ConfigService, useValue: { getOrThrow: () => 'test-secret' } },
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    setupApp(app, 'http://localhost:3000');
    await app.init();
    jwt = moduleRef.get(JwtService);
  });

  afterEach(() => app.close());

  it('devuelve la url de autologin del usuario vinculado a Moodle', async () => {
    moodleFake.solicitarUrlAutologin.mockResolvedValue(
      'http://localhost:8080/auth/userkey/login.php?key=abc',
    );
    const token = await jwt.signAsync({ sub: 'u-con-moodle', rol: Rol.Estudiante });

    const res = await request(app.getHttpServer())
      .get('/estudiante/moodle-sso')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ url: 'http://localhost:8080/auth/userkey/login.php?key=abc' });
    expect(moodleFake.solicitarUrlAutologin).toHaveBeenCalledWith(
      'con-moodle@correo.com',
      undefined,
      undefined,
    );
  });

  it('pasa actividadUrl al servicio cuando se da como query param', async () => {
    moodleFake.solicitarUrlAutologin.mockResolvedValue(
      'http://localhost:8080/auth/userkey/login.php?key=abc&wantsurl=x',
    );
    const token = await jwt.signAsync({ sub: 'u-con-moodle', rol: Rol.Estudiante });

    const res = await request(app.getHttpServer())
      .get('/estudiante/moodle-sso')
      .query({ actividadUrl: 'http://localhost:8080/mod/assign/view.php?id=5' })
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(moodleFake.solicitarUrlAutologin).toHaveBeenCalledWith(
      'con-moodle@correo.com',
      undefined,
      'http://localhost:8080/mod/assign/view.php?id=5',
    );
  });

  it('400 (sin llamar a Moodle) si el usuario no tiene moodleUserId', async () => {
    const token = await jwt.signAsync({ sub: 'u-sin-moodle', rol: Rol.Aspirante });

    const res = await request(app.getHttpServer())
      .get('/estudiante/moodle-sso')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
    expect(moodleFake.solicitarUrlAutologin).not.toHaveBeenCalled();
  });

  it('sin token -> 401', async () => {
    const res = await request(app.getHttpServer()).get('/estudiante/moodle-sso');
    expect(res.status).toBe(401);
  });
});

describe('PATCH /estudiante/push-token (e2e)', () => {
  let app: INestApplication;
  let jwt: JwtService;
  let users: InMemoryUsers;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [JwtModule.register({ secret: 'test-secret', signOptions: { expiresIn: '1h' } })],
      controllers: [EstudianteController],
      providers: [
        JwtStrategy,
        JwtAuthGuard,
        { provide: UsersService, useClass: InMemoryUsers },
        { provide: MoodleService, useValue: moodleFake },
        { provide: ConfigService, useValue: { getOrThrow: () => 'test-secret' } },
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    setupApp(app, 'http://localhost:3000');
    await app.init();
    jwt = moduleRef.get(JwtService);
    users = moduleRef.get(UsersService);
  });

  afterEach(() => app.close());

  it('guarda el token FCM del usuario autenticado', async () => {
    const token = await jwt.signAsync({ sub: 'u-con-moodle', rol: Rol.Estudiante });

    const res = await request(app.getHttpServer())
      .patch('/estudiante/push-token')
      .set('Authorization', `Bearer ${token}`)
      .send({ token: 'token-fcm-abc' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
    expect(users.items.find((u) => u.id === 'u-con-moodle')?.fcmToken).toBe('token-fcm-abc');
  });

  it('400 si el token viene vacío', async () => {
    const jwtToken = await jwt.signAsync({ sub: 'u-con-moodle', rol: Rol.Estudiante });
    const res = await request(app.getHttpServer())
      .patch('/estudiante/push-token')
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({ token: '' });
    expect(res.status).toBe(400);
  });

  it('sin token JWT -> 401', async () => {
    const res = await request(app.getHttpServer())
      .patch('/estudiante/push-token')
      .send({ token: 'token-fcm-abc' });
    expect(res.status).toBe(401);
  });
});
