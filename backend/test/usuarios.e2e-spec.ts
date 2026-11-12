import { BadRequestException, INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { setupApp } from '../src/app.setup.js';
import { JwtAuthGuard } from '../src/auth/jwt-auth.guard.js';
import { JwtStrategy } from '../src/auth/jwt.strategy.js';
import { RolesGuard } from '../src/auth/roles.guard.js';
import { MateriasService } from '../src/materias/materias.service.js';
import { MoodleService } from '../src/moodle/moodle.service.js';
import { ProgramasService } from '../src/programas/programas.service.js';
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
      programaInteresId: 'lic-software-ia',
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

const programasFake = {
  obtenerMoodleCourseShortname: vi.fn().mockResolvedValue(null),
  listar: vi.fn().mockResolvedValue([]),
  findById: vi.fn().mockResolvedValue(null),
};

const materiasFake = {
  verificarPrerequisitos: vi.fn().mockResolvedValue(undefined),
};

describe('PATCH /usuarios/:id/rol (e2e)', () => {
  let app: INestApplication;
  let jwt: JwtService;
  let users: InMemoryUsers;

  beforeEach(async () => {
    moodleFake.buscarOCrearUsuarioMoodle.mockReset().mockResolvedValue(999);
    moodleFake.matricularEnCurso.mockReset().mockResolvedValue(undefined);
    pushFake.enviar.mockReset();
    programasFake.obtenerMoodleCourseShortname.mockReset().mockResolvedValue(null);
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
        { provide: ProgramasService, useValue: programasFake },
        { provide: MateriasService, useValue: materiasFake },
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

  it('si el programa de interés del aspirante tiene curso de Moodle asignado, matricula ahí', async () => {
    programasFake.obtenerMoodleCourseShortname.mockResolvedValue('IINICIA101-SOFTWARE');
    const token = await jwt.signAsync({ sub: 'u-admin', rol: Rol.AdminAcademico });
    await request(app.getHttpServer())
      .patch('/usuarios/u-aspirante-nuevo/rol')
      .set('Authorization', `Bearer ${token}`)
      .send({ rol: 'estudiante' });

    expect(programasFake.obtenerMoodleCourseShortname).toHaveBeenCalledWith('lic-software-ia');
    expect(moodleFake.matricularEnCurso).toHaveBeenCalledWith(999, 'IINICIA101-SOFTWARE');
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

describe('POST /usuarios/:id/matricula (e2e)', () => {
  let app: INestApplication;
  let jwt: JwtService;
  let users: InMemoryUsers;

  beforeEach(async () => {
    moodleFake.buscarOCrearUsuarioMoodle.mockReset().mockResolvedValue(999);
    moodleFake.matricularEnCurso.mockReset().mockResolvedValue(undefined);
    materiasFake.verificarPrerequisitos.mockReset().mockResolvedValue(undefined);
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
        { provide: ProgramasService, useValue: programasFake },
        { provide: MateriasService, useValue: materiasFake },
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
    const res = await request(app.getHttpServer())
      .post('/usuarios/u-aspirante-nuevo/matricula')
      .send({ cursoShortname: 'IINICIA101-SOFTWARE' });
    expect(res.status).toBe(401);
  });

  it('bloquea la matrícula (400) si falta un prerequisito de la materia, sin tocar Moodle', async () => {
    materiasFake.verificarPrerequisitos.mockRejectedValue(
      new BadRequestException('No puedes matricularte en "Cálculo II": falta aprobar Cálculo I'),
    );
    const token = await jwt.signAsync({ sub: 'u-admin', rol: Rol.AdminAcademico });
    const res = await request(app.getHttpServer())
      .post('/usuarios/u-aspirante-nuevo/matricula')
      .set('Authorization', `Bearer ${token}`)
      .send({ cursoShortname: 'CALCULO2' });

    expect(res.status).toBe(400);
    expect(res.body.message).toContain('Cálculo I');
    expect(moodleFake.buscarOCrearUsuarioMoodle).not.toHaveBeenCalled();
    expect(materiasFake.verificarPrerequisitos).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'u-aspirante-nuevo' }),
      'CALCULO2',
    );
  });

  it('con rol no autorizado (coordinador) -> 403', async () => {
    const token = await jwt.signAsync({ sub: 'u-coordinador', rol: Rol.Coordinador });
    const res = await request(app.getHttpServer())
      .post('/usuarios/u-aspirante-nuevo/matricula')
      .set('Authorization', `Bearer ${token}`)
      .send({ cursoShortname: 'IINICIA101-SOFTWARE' });
    expect(res.status).toBe(403);
  });

  it('usuario inexistente -> 404', async () => {
    const token = await jwt.signAsync({ sub: 'u-admin', rol: Rol.AdminAcademico });
    const res = await request(app.getHttpServer())
      .post('/usuarios/no-existe/matricula')
      .set('Authorization', `Bearer ${token}`)
      .send({ cursoShortname: 'IINICIA101-SOFTWARE' });
    expect(res.status).toBe(404);
  });

  it('sin cursoShortname en el body -> 400', async () => {
    const token = await jwt.signAsync({ sub: 'u-admin', rol: Rol.AdminAcademico });
    const res = await request(app.getHttpServer())
      .post('/usuarios/u-aspirante-nuevo/matricula')
      .set('Authorization', `Bearer ${token}`)
      .send({});
    expect(res.status).toBe(400);
  });

  it('admin_academico matricula a un aspirante en el curso que elige, sin cambiar su rol', async () => {
    const token = await jwt.signAsync({ sub: 'u-admin', rol: Rol.AdminAcademico });
    const res = await request(app.getHttpServer())
      .post('/usuarios/u-aspirante-nuevo/matricula')
      .set('Authorization', `Bearer ${token}`)
      .send({ cursoShortname: 'IINICIA101-SOFTWARE' });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      id: 'u-aspirante-nuevo',
      nombre: 'Aspirante Nuevo',
      correo: 'aspirante@correo.com',
      rol: 'aspirante',
      moodleUserId: 999,
      createdAt: '2026-01-03T00:00:00.000Z',
      programaInteresNombre: 'lic-software-ia',
    });
    expect(moodleFake.buscarOCrearUsuarioMoodle).toHaveBeenCalledWith(
      'aspirante@correo.com',
      'Aspirante Nuevo',
    );
    expect(moodleFake.matricularEnCurso).toHaveBeenCalledWith(999, 'IINICIA101-SOFTWARE');
    expect(users.items.find((u) => u.id === 'u-aspirante-nuevo')?.moodleUserId).toBe(999);
  });

  it('matricula a un estudiante que ya tiene cuenta Moodle en un curso adicional (vincular es idempotente: devuelve el mismo id)', async () => {
    moodleFake.buscarOCrearUsuarioMoodle.mockResolvedValue(5);
    const token = await jwt.signAsync({ sub: 'u-admin', rol: Rol.AdminAcademico });
    const res = await request(app.getHttpServer())
      .post('/usuarios/u-estudiante/matricula')
      .set('Authorization', `Bearer ${token}`)
      .send({ cursoShortname: 'IINICIA102' });

    expect(res.status).toBe(201);
    expect(moodleFake.buscarOCrearUsuarioMoodle).toHaveBeenCalledWith(
      'estudiante@correo.com',
      'Estudiante Cualquiera',
    );
    expect(moodleFake.matricularEnCurso).toHaveBeenCalledWith(5, 'IINICIA102');
  });

  it('400 si el usuario no es aspirante ni estudiante (p.ej. coordinador)', async () => {
    const token = await jwt.signAsync({ sub: 'u-admin', rol: Rol.AdminAcademico });
    const res = await request(app.getHttpServer())
      .post('/usuarios/u-coordinador/matricula')
      .set('Authorization', `Bearer ${token}`)
      .send({ cursoShortname: 'IINICIA101' });

    expect(res.status).toBe(400);
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
        { provide: ProgramasService, useValue: programasFake },
        { provide: MateriasService, useValue: materiasFake },
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
      programaInteresNombre: null,
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

  it('resuelve el nombre del programa de interés cuando existe en el catálogo', async () => {
    programasFake.listar.mockResolvedValue([
      { id: 'lic-software-ia', nombre: 'Lic. en Software con IA' },
    ]);
    const token = await jwt.signAsync({ sub: 'u-admin', rol: Rol.AdminAcademico });
    const res = await request(app.getHttpServer())
      .get('/usuarios?rol=aspirante')
      .set('Authorization', `Bearer ${token}`);

    expect(res.body[0].programaInteresNombre).toBe('Lic. en Software con IA');
    programasFake.listar.mockResolvedValue([]);
  });
});

describe('GET /usuarios/cursos-moodle (e2e)', () => {
  let app: INestApplication;
  let jwt: JwtService;

  beforeEach(async () => {
    moodleFake.listarCursos = vi.fn().mockResolvedValue([
      { id: 2, shortname: 'IINICIA101', fullname: 'Curso de prueba' },
    ]);
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
        { provide: ProgramasService, useValue: programasFake },
        { provide: MateriasService, useValue: materiasFake },
        { provide: ConfigService, useValue: { getOrThrow: () => 'test-secret', get: () => 'IINICIA101' } },
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    setupApp(app, 'http://localhost:3000');
    await app.init();
    jwt = moduleRef.get(JwtService);
  });

  afterEach(() => app.close());

  it('devuelve el catálogo real de cursos de Moodle', async () => {
    const token = await jwt.signAsync({ sub: 'u-admin', rol: Rol.AdminAcademico });
    const res = await request(app.getHttpServer())
      .get('/usuarios/cursos-moodle')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual([{ id: 2, shortname: 'IINICIA101', fullname: 'Curso de prueba' }]);
  });

  it('con rol no autorizado (coordinador) -> 403', async () => {
    const token = await jwt.signAsync({ sub: 'u-coordinador', rol: Rol.Coordinador });
    const res = await request(app.getHttpServer())
      .get('/usuarios/cursos-moodle')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
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
        { provide: ProgramasService, useValue: programasFake },
        { provide: MateriasService, useValue: materiasFake },
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
      undefined,
    );
  });

  it('envía cursoId como data cuando se da, para el deep link en Android', async () => {
    const token = await jwt.signAsync({ sub: 'u-admin', rol: Rol.AdminAcademico });
    const res = await request(app.getHttpServer())
      .post('/usuarios/u-con-token/notificar')
      .set('Authorization', `Bearer ${token}`)
      .send({ titulo: 'Aviso', mensaje: 'Revisa el curso', cursoId: '42' });

    expect(res.status).toBe(201);
    expect(pushFake.enviar).toHaveBeenCalledWith('token-fcm-123', 'Aviso', 'Revisa el curso', {
      cursoId: '42',
    });
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
