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
    } as User,
    {
      id: 'u-estudiante',
      nombre: 'Estudiante Cualquiera',
      correo: 'estudiante@correo.com',
      passwordHash: 'x',
      rol: Rol.Estudiante,
      moodleUserId: 5,
    } as User,
    {
      id: 'u-aspirante-nuevo',
      nombre: 'Aspirante Nuevo',
      correo: 'aspirante@correo.com',
      passwordHash: 'x',
      rol: Rol.Aspirante,
      moodleUserId: null,
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
}

const moodleFake = {
  buscarOCrearUsuarioMoodle: vi.fn(),
  matricularEnCurso: vi.fn(),
};

describe('PATCH /usuarios/:id/rol (e2e)', () => {
  let app: INestApplication;
  let jwt: JwtService;
  let users: InMemoryUsers;

  beforeEach(async () => {
    moodleFake.buscarOCrearUsuarioMoodle.mockReset().mockResolvedValue(999);
    moodleFake.matricularEnCurso.mockReset().mockResolvedValue(undefined);
    const moduleRef = await Test.createTestingModule({
      imports: [JwtModule.register({ secret: 'test-secret', signOptions: { expiresIn: '1h' } })],
      controllers: [UsuariosController],
      providers: [
        JwtStrategy,
        JwtAuthGuard,
        RolesGuard,
        { provide: UsersService, useClass: InMemoryUsers },
        { provide: MoodleService, useValue: moodleFake },
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
