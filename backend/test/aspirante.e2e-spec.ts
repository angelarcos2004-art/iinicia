import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { setupApp } from '../src/app.setup.js';
import { AspiranteController } from '../src/aspirante/aspirante.controller.js';
import { JwtAuthGuard } from '../src/auth/jwt-auth.guard.js';
import { JwtStrategy } from '../src/auth/jwt.strategy.js';
import { RolesGuard } from '../src/auth/roles.guard.js';
import { DocumentosService } from '../src/documentos/documentos.service.js';
import { ProgramasService } from '../src/programas/programas.service.js';
import { Rol } from '../src/users/rol.enum.js';
import type { User } from '../src/users/user.entity.js';
import { UsersService } from '../src/users/users.service.js';

class InMemoryUsers {
  items: User[] = [
    { id: 'a1', correo: 'aspirante@correo.com', nombre: 'Luis', rol: Rol.Aspirante, programaInteresId: null } as User,
    { id: 'u-estudiante', correo: 'estudiante@correo.com', nombre: 'Estudiante', rol: Rol.Estudiante } as User,
  ];
  async findById(id: string) {
    return this.items.find((u) => u.id === id) ?? null;
  }
}

describe('Aspirante (e2e)', () => {
  let app: INestApplication;
  let jwt: JwtService;
  let documentosFake: {
    listarPorUsuario: ReturnType<typeof vi.fn>;
    crear: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    documentosFake = {
      listarPorUsuario: vi.fn().mockResolvedValue([]),
      crear: vi.fn().mockImplementation(async (data) => ({
        id: 'd1',
        estado: 'pendiente',
        createdAt: new Date('2026-01-01'),
        ...data,
      })),
    };
    const moduleRef = await Test.createTestingModule({
      imports: [JwtModule.register({ secret: 'test-secret', signOptions: { expiresIn: '1h' } })],
      controllers: [AspiranteController],
      providers: [
        JwtStrategy,
        JwtAuthGuard,
        RolesGuard,
        { provide: UsersService, useClass: InMemoryUsers },
        { provide: ProgramasService, useValue: { findById: vi.fn().mockResolvedValue(null) } },
        { provide: DocumentosService, useValue: documentosFake },
        { provide: ConfigService, useValue: { getOrThrow: () => 'test-secret' } },
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    setupApp(app, 'http://localhost:3000');
    await app.init();
    jwt = moduleRef.get(JwtService);
  });

  afterEach(() => app.close());

  describe('GET /aspirante/solicitud', () => {
    it('sin sesión -> 401', async () => {
      const res = await request(app.getHttpServer()).get('/aspirante/solicitud');
      expect(res.status).toBe(401);
    });

    it('con rol no autorizado (estudiante) -> 403', async () => {
      const token = await jwt.signAsync({ sub: 'u-estudiante', rol: Rol.Estudiante });
      const res = await request(app.getHttpServer())
        .get('/aspirante/solicitud')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(403);
    });

    it('aspirante ve el estado real de su solicitud', async () => {
      const token = await jwt.signAsync({ sub: 'a1', rol: Rol.Aspirante });
      const res = await request(app.getHttpServer())
        .get('/aspirante/solicitud')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.estado).toBe('en_revision');
      expect(res.body.pasos).toHaveLength(4);
    });
  });

  describe('GET /aspirante/documentos', () => {
    it('sin sesión -> 401', async () => {
      const res = await request(app.getHttpServer()).get('/aspirante/documentos');
      expect(res.status).toBe(401);
    });

    it('devuelve los documentos ya subidos por el aspirante autenticado', async () => {
      documentosFake.listarPorUsuario.mockResolvedValue([
        {
          id: 'd1',
          tipo: 'identificacion',
          nombreOriginal: 'ine.pdf',
          mimeType: 'application/pdf',
          rutaArchivo: '/secreto.pdf',
          estado: 'pendiente',
          createdAt: new Date('2026-01-01'),
        },
      ]);
      const token = await jwt.signAsync({ sub: 'a1', rol: Rol.Aspirante });
      const res = await request(app.getHttpServer())
        .get('/aspirante/documentos')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0]).not.toHaveProperty('rutaArchivo');
      expect(documentosFake.listarPorUsuario).toHaveBeenCalledWith('a1');
    });
  });

  describe('POST /aspirante/documentos', () => {
    it('sin sesión -> 401', async () => {
      const res = await request(app.getHttpServer())
        .post('/aspirante/documentos')
        .field('tipo', 'identificacion');
      expect(res.status).toBe(401);
    });

    it('sin archivo adjunto -> 400', async () => {
      const token = await jwt.signAsync({ sub: 'a1', rol: Rol.Aspirante });
      const res = await request(app.getHttpServer())
        .post('/aspirante/documentos')
        .set('Authorization', `Bearer ${token}`)
        .field('tipo', 'identificacion');
      expect(res.status).toBe(400);
      expect(documentosFake.crear).not.toHaveBeenCalled();
    });

    it('con un PDF válido, lo sube y lo asocia al aspirante autenticado', async () => {
      const token = await jwt.signAsync({ sub: 'a1', rol: Rol.Aspirante });
      const res = await request(app.getHttpServer())
        .post('/aspirante/documentos')
        .set('Authorization', `Bearer ${token}`)
        .field('tipo', 'identificacion')
        .attach('archivo', Buffer.from('%PDF-1.4 contenido de prueba'), {
          filename: 'ine.pdf',
          contentType: 'application/pdf',
        });

      expect(res.status).toBe(201);
      expect(res.body.estado).toBe('pendiente');
      expect(res.body).not.toHaveProperty('rutaArchivo');
      expect(documentosFake.crear).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'a1', tipo: 'identificacion', nombreOriginal: 'ine.pdf' }),
      );
    });

    it('rechaza un tipo de archivo no permitido (p. ej. texto plano)', async () => {
      const token = await jwt.signAsync({ sub: 'a1', rol: Rol.Aspirante });
      const res = await request(app.getHttpServer())
        .post('/aspirante/documentos')
        .set('Authorization', `Bearer ${token}`)
        .field('tipo', 'identificacion')
        .attach('archivo', Buffer.from('hola'), { filename: 'nota.txt', contentType: 'text/plain' });

      expect(res.status).toBe(400);
      expect(documentosFake.crear).not.toHaveBeenCalled();
    });
  });
});
