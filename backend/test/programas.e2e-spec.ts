import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { setupApp } from '../src/app.setup.js';
import { JwtAuthGuard } from '../src/auth/jwt-auth.guard.js';
import { JwtStrategy } from '../src/auth/jwt.strategy.js';
import { RolesGuard } from '../src/auth/roles.guard.js';
import type { Programa } from '../src/programas/programa.entity.js';
import { ProgramasController } from '../src/programas/programas.controller.js';
import { ProgramasService } from '../src/programas/programas.service.js';
import { Rol } from '../src/users/rol.enum.js';
import type { User } from '../src/users/user.entity.js';
import { UsersService } from '../src/users/users.service.js';

class InMemoryUsers {
  items: User[] = [
    {
      id: 'u-admin',
      correo: 'admin@correo.com',
      nombre: 'Admin',
      rol: Rol.AdminAcademico,
    } as User,
    {
      id: 'u-estudiante',
      correo: 'estudiante@correo.com',
      nombre: 'Estudiante',
      rol: Rol.Estudiante,
    } as User,
  ];
  async findById(id: string) {
    return this.items.find((u) => u.id === id) ?? null;
  }
}

const programaBase: Programa = {
  id: 'lic-software-ia',
  tipo: 'licenciatura',
  nombre: 'Ingeniería de Software e IA',
  descripcion: 'Forma ingenieros en IA aplicada.',
  duracion: '12 cuatrimestres',
  modalidad: 'en_linea',
  moodleCourseShortname: null,
};

describe('Programas (e2e)', () => {
  let app: INestApplication;
  let jwt: JwtService;
  let programasFake: { listar: ReturnType<typeof vi.fn>; crear: ReturnType<typeof vi.fn>; actualizar: ReturnType<typeof vi.fn> };

  beforeEach(async () => {
    programasFake = {
      listar: vi.fn().mockResolvedValue([programaBase]),
      crear: vi.fn().mockImplementation(async (dto) => ({ ...dto, moodleCourseShortname: dto.moodleCourseShortname ?? null })),
      actualizar: vi.fn().mockImplementation(async (id, dto) => ({ ...programaBase, id, ...dto })),
    };
    const moduleRef = await Test.createTestingModule({
      imports: [JwtModule.register({ secret: 'test-secret', signOptions: { expiresIn: '1h' } })],
      controllers: [ProgramasController],
      providers: [
        JwtStrategy,
        JwtAuthGuard,
        RolesGuard,
        { provide: UsersService, useClass: InMemoryUsers },
        { provide: ProgramasService, useValue: programasFake },
        { provide: ConfigService, useValue: { getOrThrow: () => 'test-secret' } },
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    setupApp(app, 'http://localhost:3000');
    await app.init();
    jwt = moduleRef.get(JwtService);
  });

  afterEach(() => app.close());

  it('GET /programas es público (sin token) y devuelve el catálogo', async () => {
    const res = await request(app.getHttpServer()).get('/programas');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([programaBase]);
  });

  it('POST /programas crea un programa (admin académico)', async () => {
    const token = await jwt.signAsync({ sub: 'u-admin', rol: Rol.AdminAcademico });
    const nuevo = {
      id: 'dip-cloud',
      tipo: 'diplomado',
      nombre: 'Cloud Architecture',
      descripcion: 'Arquitecturas en la nube.',
      duracion: '4 meses',
      modalidad: 'en_linea',
    };
    const res = await request(app.getHttpServer())
      .post('/programas')
      .set('Authorization', `Bearer ${token}`)
      .send(nuevo);
    expect(res.status).toBe(201);
    expect(res.body).toEqual({ ...nuevo, moodleCourseShortname: null });
    expect(programasFake.crear).toHaveBeenCalledWith(nuevo);
  });

  it('POST /programas sin sesión -> 401', async () => {
    const res = await request(app.getHttpServer()).post('/programas').send(programaBase);
    expect(res.status).toBe(401);
    expect(programasFake.crear).not.toHaveBeenCalled();
  });

  it('POST /programas con rol no autorizado (estudiante) -> 403', async () => {
    const token = await jwt.signAsync({ sub: 'u-estudiante', rol: Rol.Estudiante });
    const res = await request(app.getHttpServer())
      .post('/programas')
      .set('Authorization', `Bearer ${token}`)
      .send(programaBase);
    expect(res.status).toBe(403);
    expect(programasFake.crear).not.toHaveBeenCalled();
  });

  it('POST /programas con datos inválidos -> 400', async () => {
    const token = await jwt.signAsync({ sub: 'u-admin', rol: Rol.AdminAcademico });
    const res = await request(app.getHttpServer())
      .post('/programas')
      .set('Authorization', `Bearer ${token}`)
      .send({ ...programaBase, tipo: 'doctorado' });
    expect(res.status).toBe(400);
  });

  it('PATCH /programas/:id asigna el curso de Moodle del programa (admin académico)', async () => {
    const token = await jwt.signAsync({ sub: 'u-admin', rol: Rol.AdminAcademico });
    const res = await request(app.getHttpServer())
      .patch('/programas/lic-software-ia')
      .set('Authorization', `Bearer ${token}`)
      .send({ moodleCourseShortname: 'IINICIA101' });
    expect(res.status).toBe(200);
    expect(res.body.moodleCourseShortname).toBe('IINICIA101');
    expect(programasFake.actualizar).toHaveBeenCalledWith('lic-software-ia', {
      moodleCourseShortname: 'IINICIA101',
    });
  });

  it('PATCH /programas/:id sin sesión -> 401', async () => {
    const res = await request(app.getHttpServer())
      .patch('/programas/lic-software-ia')
      .send({ moodleCourseShortname: 'IINICIA101' });
    expect(res.status).toBe(401);
  });
});
