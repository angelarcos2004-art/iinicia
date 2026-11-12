import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { setupApp } from '../src/app.setup.js';
import { JwtAuthGuard } from '../src/auth/jwt-auth.guard.js';
import { JwtStrategy } from '../src/auth/jwt.strategy.js';
import { RolesGuard } from '../src/auth/roles.guard.js';
import type { Materia } from '../src/materias/materia.entity.js';
import { MateriasController } from '../src/materias/materias.controller.js';
import { MateriasService } from '../src/materias/materias.service.js';
import { Rol } from '../src/users/rol.enum.js';
import type { User } from '../src/users/user.entity.js';
import { UsersService } from '../src/users/users.service.js';

class InMemoryUsers {
  items: User[] = [
    { id: 'u-admin', correo: 'admin@correo.com', nombre: 'Admin', rol: Rol.AdminAcademico } as User,
    { id: 'u-estudiante', correo: 'estudiante@correo.com', nombre: 'Estudiante', rol: Rol.Estudiante } as User,
  ];
  async findById(id: string) {
    return this.items.find((u) => u.id === id) ?? null;
  }
}

const calculo1: Materia = {
  id: 'calculo-1',
  programaId: 'lic-software-ia',
  nombre: 'Cálculo I',
  moodleCourseShortname: 'CALCULO1',
  prerequisitos: [],
};

describe('Materias (e2e)', () => {
  let app: INestApplication;
  let jwt: JwtService;
  let materiasFake: {
    listar: ReturnType<typeof vi.fn>;
    crear: ReturnType<typeof vi.fn>;
    actualizar: ReturnType<typeof vi.fn>;
    eliminar: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    materiasFake = {
      listar: vi.fn().mockResolvedValue([calculo1]),
      crear: vi.fn().mockImplementation(async (dto) => ({ ...dto, prerequisitos: dto.prerequisitos ?? [] })),
      actualizar: vi.fn().mockImplementation(async (id, dto) => ({ ...calculo1, id, ...dto })),
      eliminar: vi.fn().mockResolvedValue(undefined),
    };
    const moduleRef = await Test.createTestingModule({
      imports: [JwtModule.register({ secret: 'test-secret', signOptions: { expiresIn: '1h' } })],
      controllers: [MateriasController],
      providers: [
        JwtStrategy,
        JwtAuthGuard,
        RolesGuard,
        { provide: UsersService, useClass: InMemoryUsers },
        { provide: MateriasService, useValue: materiasFake },
        { provide: ConfigService, useValue: { getOrThrow: () => 'test-secret' } },
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    setupApp(app, 'http://localhost:3000');
    await app.init();
    jwt = moduleRef.get(JwtService);
  });

  afterEach(() => app.close());

  it('GET /materias requiere sesión (a diferencia de /programas, no es pública) -> 401', async () => {
    const res = await request(app.getHttpServer()).get('/materias');
    expect(res.status).toBe(401);
  });

  it('GET /materias?programaId= filtra por carrera (admin académico)', async () => {
    const token = await jwt.signAsync({ sub: 'u-admin', rol: Rol.AdminAcademico });
    const res = await request(app.getHttpServer())
      .get('/materias?programaId=lic-software-ia')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([calculo1]);
    expect(materiasFake.listar).toHaveBeenCalledWith('lic-software-ia');
  });

  it('GET /materias con rol no autorizado (estudiante) -> 403', async () => {
    const token = await jwt.signAsync({ sub: 'u-estudiante', rol: Rol.Estudiante });
    const res = await request(app.getHttpServer())
      .get('/materias')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it('POST /materias crea una materia (admin académico)', async () => {
    const token = await jwt.signAsync({ sub: 'u-admin', rol: Rol.AdminAcademico });
    const nueva = {
      id: 'calculo-2',
      programaId: 'lic-software-ia',
      nombre: 'Cálculo II',
      moodleCourseShortname: 'CALCULO2',
      prerequisitos: ['calculo-1'],
    };
    const res = await request(app.getHttpServer())
      .post('/materias')
      .set('Authorization', `Bearer ${token}`)
      .send(nueva);
    expect(res.status).toBe(201);
    expect(res.body).toEqual(nueva);
    expect(materiasFake.crear).toHaveBeenCalledWith(nueva);
  });

  it('POST /materias sin sesión -> 401', async () => {
    const res = await request(app.getHttpServer()).post('/materias').send(calculo1);
    expect(res.status).toBe(401);
    expect(materiasFake.crear).not.toHaveBeenCalled();
  });

  it('POST /materias con datos inválidos (sin nombre) -> 400', async () => {
    const token = await jwt.signAsync({ sub: 'u-admin', rol: Rol.AdminAcademico });
    const res = await request(app.getHttpServer())
      .post('/materias')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...calculo1, nombre: '' });
    expect(res.status).toBe(400);
    expect(materiasFake.crear).not.toHaveBeenCalled();
  });

  it('PATCH /materias/:id edita nombre, curso o prerequisitos (admin académico)', async () => {
    const token = await jwt.signAsync({ sub: 'u-admin', rol: Rol.AdminAcademico });
    const res = await request(app.getHttpServer())
      .patch('/materias/calculo-1')
      .set('Authorization', `Bearer ${token}`)
      .send({ nombre: 'Cálculo I (nuevo nombre)' });
    expect(res.status).toBe(200);
    expect(res.body.nombre).toBe('Cálculo I (nuevo nombre)');
    expect(materiasFake.actualizar).toHaveBeenCalledWith('calculo-1', {
      nombre: 'Cálculo I (nuevo nombre)',
    });
  });

  it('DELETE /materias/:id borra la materia (admin académico) -> 204', async () => {
    const token = await jwt.signAsync({ sub: 'u-admin', rol: Rol.AdminAcademico });
    const res = await request(app.getHttpServer())
      .delete('/materias/calculo-1')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(204);
    expect(materiasFake.eliminar).toHaveBeenCalledWith('calculo-1');
  });

  it('DELETE /materias/:id con rol no autorizado (estudiante) -> 403', async () => {
    const token = await jwt.signAsync({ sub: 'u-estudiante', rol: Rol.Estudiante });
    const res = await request(app.getHttpServer())
      .delete('/materias/calculo-1')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
    expect(materiasFake.eliminar).not.toHaveBeenCalled();
  });
});
