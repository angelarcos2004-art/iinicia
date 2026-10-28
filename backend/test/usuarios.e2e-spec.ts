import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { setupApp } from '../src/app.setup.js';
import { JwtAuthGuard } from '../src/auth/jwt-auth.guard.js';
import { JwtStrategy } from '../src/auth/jwt.strategy.js';
import { RolesGuard } from '../src/auth/roles.guard.js';
import { MoodleService } from '../src/moodle/moodle.service.js';
import { PushService } from '../src/push/push.service.js';
import { Rol } from '../src/users/rol.enum.js';
import type { User } from '../src/users/user.entity.js';
import { UsersService } from '../src/users/users.service.js';
import { UsuariosController } from '../src/usuarios/usuarios.controller.js';

class InMemoryUsers {
  items: User[] = [
    {
      id: 'u-admin',
      nombre: 'Admin Académico',
      correo: 'admin@correo.com',
      passwordHash: 'x',
      rol: Rol.AdminAcademico,
      moodleUserId: null,
      createdAt: new Date('2026-01-01'),
    } as User,
    {
      id: 'u-estudiante',
      nombre: 'Estudiante Cualquiera',
      correo: 'estudiante@correo.com',
      passwordHash: 'x',
      rol: Rol.Estudiante,
      moodleUserId: 5,
      createdAt: new Date('2026-01-02'),
    } as User,
    {
      id: 'u-aspirante-nuevo',
      nombre: 'Aspirante Nuevo',
      correo: 'aspirante@correo.com',
      passwordHash: 'x',
      rol: Rol.Aspirante,
      moodleUserId: null,
      createdAt: new Date('2026-01-03'),
    } as User,
    {
      id: 'u-coordinador',
      nombre: 'Coordinador Cualquiera',
      correo: 'coordinador@correo.com',
      passwordHash: 'x',
      rol: Rol.Coordinador,
      moodleUserId: null,
      createdAt: new Date('2026-01-04'),
    } as User,
  ];
  async findById(id: string) {
    return this.items.find((u) => u.id === id) ?? null;
  }
  async actualizarRol(id: string, rol: Rol) {
    const user = this.items.find((u) => u.id === id);
    if (user) user.rol = rol;
  }
  async actualizarMoodleUserId(id: string, moodleUserId: number) {
    const user = this.items.find((u) => u.id === id);
    if (user) user.moodleUserId = moodleUserId;
  }
  async listar(rol?: Rol) {
    return rol ? this.items.filter((u) => u.rol === rol) : this.items;
  }
}

const moodleFake = {
  buscarOCrearUsuarioMoodle: vi.fn(),
  matricularEnCurso: vi.fn(),
};

const pushFake = {
  enviar: vi.fn(),
};

describe('PATCH /usuarios/:id/rol (e2e)', () => {
  let app: INestApplication;
  let jwt: JwtService;
  let users: InMemoryUsers;

  beforeEach(async () => {
    moodleFake.buscarOCrearUsuarioMoodle.mockReset().mockResolvedValue(999);
    moodleFake.matricularEnCurso.mockReset().mockResolvedValue(undefined);
    pushFake.enviar.mockReset();
    const moduleRef = await Test.createTestingModule({
      imports: [JwtModule.register({ secret: 'test-secret', signOptions: { expiresIn: '1h' } })],
      controllers: [UsuariosController],
      providers: [
        JwtStrategy,
        JwtAuthGuard,
        RolesGuard,
        { provide: UsersService, useClass: InMemoryUsers },
        { provide: MoodleService, useValue: moodleFake },
        { provide: PushService, useValue: pushFake },
        { provide: ConfigService, useValue: { getOrThrow: () => 'test-secret', get: () => 'IINICIA101' } },
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    setupApp(app, 'http://localhost:3000');
    await app.init();
    jwt = moduleRef.get(JwtService);
    users = moduleRef.get(UsersService);
  });

  afterEach(() => app.close());

  it('sin token -> 401', async () => {
    const res = await request(app.getHttpServer()).patch('/usuarios/u-aspirante-nuevo/rol').send({
      rol: 'estudiante',
    });
    expect(res.status).toBe(401);
  });

  it('con rol no autorizado (estudiante) -> 403', async () => {
    const token = await jwt.signAsync({ sub: 'u-estudiante', rol: Rol.Estudiante });
    const res = await request(app.getHttpServer())
      .patch('/usuarios/u-aspirante-nuevo/rol')
      .set('Authorization', `Bearer ${token}`)
      .send({ rol: 'estudiante' });
    expect(res.status).toBe(403);
  });

  it('con rol inválido en el body -> 400', async () => {
    const token = await jwt.signAsync({ sub: 'u-admin', rol: Rol.AdminAcademico });
    const res = await request(app.getHttpServer())
      .patch('/usuarios/u-aspirante-nuevo/rol')
      .set('Authorization', `Bearer ${token}`)
      .send({ rol: 'director-de-la-nasa' });
    expect(res.status).toBe(400);
  });

  it('usuario inexistente -> 404', async () => {
    const token = await jwt.signAsync({ sub: 'u-admin', rol: Rol.AdminAcademico });
    const res = await request(app.getHttpServer())
      .patch('/usuarios/no-existe/rol')
      .set('Authorization', `Bearer ${token}`)
      .send({ rol: 'estudiante' });
    expect(res.status).toBe(404);
  });

  it('admin_academico promueve aspirante a estudiante: actualiza rol y vincula/matricula en Moodle', async () => {
    const token = await jwt.signAsync({ sub: 'u-admin', rol: Rol.AdminAcademico });
    const res = await request(app.getHttpServer())
      .patch('/usuarios/u-aspirante-nuevo/rol')
      .set('Authorization', `Bearer ${token}`)
      .send({ rol: 'estudiante' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      id: 'u-aspirante-nuevo',
      nombre: 'Aspirante Nuevo',
      correo: 'aspirante@correo.com',
      rol: 'estudiante',
    });
    expect(users.items.find((u) => u.id === 'u-aspirante-nuevo')?.rol).toBe(Rol.Estudiante);
    expect(moodleFake.buscarOCrearUsuarioMoodle).toHaveBeenCalledWith(
      'aspirante@correo.com',
      'Aspirante Nuevo',
    );
    expect(moodleFake.matricularEnCurso).toHaveBeenCalledWith(999, 'IINICIA101');
  });

  it('promover a estudiante a alguien que YA tiene cuenta Moodle no vuelve a crearla (idempotente)', async () => {
    const token = await jwt.signAsync({ sub: 'u-admin', rol: Rol.AdminAcademico });
    const res = await request(app.getHttpServer())
      .patch('/usuarios/u-estudiante/rol')
      .set('Authorization', `Bearer ${token}`)
      .send({ rol: 'estudiante' });

    expect(res.status).toBe(200);
    expect(moodleFake.buscarOCrearUsuarioMoodle).not.toHaveBeenCalled();
  });

  it('promover a un rol distinto de estudiante no toca Moodle', async () => {
    const token = await jwt.signAsync({ sub: 'u-admin', rol: Rol.AdminAcademico });
    const res = await request(app.getHttpServer())
      .patch('/usuarios/u-aspirante-nuevo/rol')
      .set('Authorization', `Bearer ${token}`)
      .send({ rol: 'coordinador' });

    expect(res.status).toBe(200);
    expect(res.body.rol).toBe('coordinador');
    expect(moodleFake.buscarOCrearUsuarioMoodle).not.toHaveBeenCalled();
  });
});

describe('GET /usuarios (e2e)', () => {
  let app: INestApplication;
  let jwt: JwtService;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [JwtModule.register({ secret: 'test-secret', signOptions: { expiresIn: '1h' } })],
      controllers: [UsuariosController],
      providers: [
        JwtStrategy,
        JwtAuthGuard,
        RolesGuard,
        { provide: UsersService, useClass: InMemoryUsers },
        { provide: MoodleService, useValue: moodleFake },
        { provide: PushService, useValue: pushFake },
        { provide: ConfigService, useValue: { getOrThrow: () => 'test-secret', get: () => 'IINICIA101' } },
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    setupApp(app, 'http://localhost:3000');
    await app.init();
    jwt = moduleRef.get(JwtService);
  });

  afterEach(() => app.close());

  it('sin token -> 401', async () => {
    const res = await request(app.getHttpServer()).get('/usuarios');
    expect(res.status).toBe(401);
  });

  it('con rol no autorizado (estudiante) -> 403', async () => {
    const token = await jwt.signAsync({ sub: 'u-estudiante', rol: Rol.Estudiante });
    const res = await request(app.getHttpServer())
      .get('/usuarios')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it('admin_academico ve la lista completa', async () => {
    const token = await jwt.signAsync({ sub: 'u-admin', rol: Rol.AdminAcademico });
    const res = await request(app.getHttpServer())
      .get('/usuarios')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(4);
    expect(res.body[0]).toEqual({
      id: 'u-admin',
      nombre: 'Admin Académico',
      correo: 'admin@correo.com',
      rol: 'admin_academico',
      moodleUserId: null,
      createdAt: '2026-01-01T00:00:00.000Z',
    });
  });

  it('coordinador también puede listar (solo lectura)', async () => {
    const token = await jwt.signAsync({ sub: 'u-coordinador', rol: Rol.Coordinador });
    const res = await request(app.getHttpServer())
      .get('/usuarios')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
  });

  it('filtra por ?rol=', async () => {
    const token = await jwt.signAsync({ sub: 'u-admin', rol: Rol.AdminAcademico });
    const res = await request(app.getHttpServer())
      .get('/usuarios?rol=aspirante')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].id).toBe('u-aspirante-nuevo');
  });

  it('?rol= inválido -> 400', async () => {
    const token = await jwt.signAsync({ sub: 'u-admin', rol: Rol.AdminAcademico });
    const res = await request(app.getHttpServer())
      .get('/usuarios?rol=director-de-la-nasa')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
  });
});

describe('POST /usuarios/:id/notificar (e2e)', () => {
  let app: INestApplication;
  let jwt: JwtService;

  class InMemoryUsersConToken extends InMemoryUsers {
    override items: User[] = [
      ...this.items,
      {
        id: 'u-con-token',
        nombre: 'Con Token',
        correo: 'con-token@correo.com',
        passwordHash: 'x',
        rol: Rol.Estudiante,
        moodleUserId: 5,
        fcmToken: 'token-fcm-123',
        createdAt: new Date('2026-01-05'),
      } as User,
    ];
  }

  beforeEach(async () => {
    pushFake.enviar.mockReset().mockResolvedValue(undefined);
    const moduleRef = await Test.createTestingModule({
      imports: [JwtModule.register({ secret: 'test-secret', signOptions: { expiresIn: '1h' } })],
      controllers: [UsuariosController],
      providers: [
        JwtStrategy,
        JwtAuthGuard,
        RolesGuard,
        { provide: UsersService, useClass: InMemoryUsersConToken },
        { provide: MoodleService, useValue: moodleFake },
        { provide: PushService, useValue: pushFake },
        { provide: ConfigService, useValue: { getOrThrow: () => 'test-secret', get: () => 'IINICIA101' } },
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    setupApp(app, 'http://localhost:3000');
    await app.init();
    jwt = moduleRef.get(JwtService);
  });

  afterEach(() => app.close());

  it('envía la notificación al token FCM del usuario', async () => {
    const token = await jwt.signAsync({ sub: 'u-admin', rol: Rol.AdminAcademico });
    const res = await request(app.getHttpServer())
      .post('/usuarios/u-con-token/notificar')
      .set('Authorization', `Bearer ${token}`)
      .send({ titulo: 'Aviso', mensaje: 'Tu clase de mañana se reprograma.' });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ enviado: true });
    expect(pushFake.enviar).toHaveBeenCalledWith(
      'token-fcm-123',
      'Aviso',
      'Tu clase de mañana se reprograma.',
    );
  });

  it('400 (sin llamar a push) si el usuario no tiene dispositivo registrado', async () => {
    const token = await jwt.signAsync({ sub: 'u-admin', rol: Rol.AdminAcademico });
    const res = await request(app.getHttpServer())
      .post('/usuarios/u-aspirante-nuevo/notificar')
      .set('Authorization', `Bearer ${token}`)
      .send({ titulo: 'Aviso', mensaje: 'Hola' });

    expect(res.status).toBe(400);
    expect(pushFake.enviar).not.toHaveBeenCalled();
  });

  it('404 si el usuario no existe', async () => {
    const token = await jwt.signAsync({ sub: 'u-admin', rol: Rol.AdminAcademico });
    const res = await request(app.getHttpServer())
      .post('/usuarios/no-existe/notificar')
      .set('Authorization', `Bearer ${token}`)
      .send({ titulo: 'Aviso', mensaje: 'Hola' });

    expect(res.status).toBe(404);
  });

  it('403 si el rol no está autorizado (estudiante)', async () => {
    const token = await jwt.signAsync({ sub: 'u-estudiante', rol: Rol.Estudiante });
    const res = await request(app.getHttpServer())
      .post('/usuarios/u-con-token/notificar')
      .set('Authorization', `Bearer ${token}`)
      .send({ titulo: 'Aviso', mensaje: 'Hola' });

    expect(res.status).toBe(403);
    expect(pushFake.enviar).not.toHaveBeenCalled();
  });

  it('400 si falta el título o el mensaje', async () => {
    const token = await jwt.signAsync({ sub: 'u-admin', rol: Rol.AdminAcademico });
    const res = await request(app.getHttpServer())
      .post('/usuarios/u-con-token/notificar')
      .set('Authorization', `Bearer ${token}`)
      .send({ titulo: '', mensaje: '' });

    expect(res.status).toBe(400);
    expect(pushFake.enviar).not.toHaveBeenCalled();
  });

  it('sin token JWT -> 401', async () => {
    const res = await request(app.getHttpServer())
      .post('/usuarios/u-con-token/notificar')
      .send({ titulo: 'Aviso', mensaje: 'Hola' });
    expect(res.status).toBe(401);
  });
});
