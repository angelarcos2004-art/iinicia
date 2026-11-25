import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import request from 'supertest';
import { setupApp } from '../src/app.setup.js';
import { JwtAuthGuard } from '../src/auth/jwt-auth.guard.js';
import { JwtStrategy } from '../src/auth/jwt.strategy.js';
import { RolesGuard } from '../src/auth/roles.guard.js';
import type { Documento } from '../src/documentos/documento.entity.js';
import { DocumentosController } from '../src/documentos/documentos.controller.js';
import { DocumentosService } from '../src/documentos/documentos.service.js';
import { Rol } from '../src/users/rol.enum.js';
import type { User } from '../src/users/user.entity.js';
import { UsersService } from '../src/users/users.service.js';

class InMemoryUsers {
  items: User[] = [
    { id: 'u-admin', correo: 'admin@correo.com', nombre: 'Admin', rol: Rol.AdminAcademico } as User,
    { id: 'u-coord', correo: 'coord@correo.com', nombre: 'Coordinador', rol: Rol.Coordinador } as User,
    { id: 'u-estudiante', correo: 'estudiante@correo.com', nombre: 'Estudiante', rol: Rol.Estudiante } as User,
  ];
  async findById(id: string) {
    return this.items.find((u) => u.id === id) ?? null;
  }
}

const docBase = {
  id: 'd1',
  tipo: 'identificacion',
  nombreOriginal: 'ine.pdf',
  mimeType: 'application/pdf',
  estado: 'pendiente',
  createdAt: new Date('2026-01-01'),
} as Documento;

describe('Documentos (e2e)', () => {
  let app: INestApplication;
  let jwt: JwtService;
  let documentosFake: {
    listarPorUsuario: ReturnType<typeof vi.fn>;
    findById: ReturnType<typeof vi.fn>;
    actualizarEstado: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    documentosFake = {
      listarPorUsuario: vi.fn().mockResolvedValue([docBase]),
      findById: vi.fn().mockResolvedValue(docBase),
      actualizarEstado: vi.fn().mockImplementation(async (id, estado) => ({ ...docBase, id, estado })),
    };
    const moduleRef = await Test.createTestingModule({
      imports: [JwtModule.register({ secret: 'test-secret', signOptions: { expiresIn: '1h' } })],
      controllers: [DocumentosController],
      providers: [
        JwtStrategy,
        JwtAuthGuard,
        RolesGuard,
        { provide: UsersService, useClass: InMemoryUsers },
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

  describe('GET /documentos/usuario/:userId', () => {
    it('sin sesión -> 401', async () => {
      const res = await request(app.getHttpServer()).get('/documentos/usuario/a1');
      expect(res.status).toBe(401);
    });

    it('con rol no autorizado (estudiante) -> 403', async () => {
      const token = await jwt.signAsync({ sub: 'u-estudiante', rol: Rol.Estudiante });
      const res = await request(app.getHttpServer())
        .get('/documentos/usuario/a1')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(403);
    });

    it('coordinador puede ver los documentos de un aspirante', async () => {
      const token = await jwt.signAsync({ sub: 'u-coord', rol: Rol.Coordinador });
      const res = await request(app.getHttpServer())
        .get('/documentos/usuario/a1')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].id).toBe('d1');
      expect(res.body[0]).not.toHaveProperty('rutaArchivo');
      expect(documentosFake.listarPorUsuario).toHaveBeenCalledWith('a1');
    });
  });

  describe('PATCH /documentos/:id/estado', () => {
    it('sin sesión -> 401', async () => {
      const res = await request(app.getHttpServer())
        .patch('/documentos/d1/estado')
        .send({ estado: 'aprobado' });
      expect(res.status).toBe(401);
    });

    it('coordinador no puede revisar (solo superadmin/admin_academico) -> 403', async () => {
      const token = await jwt.signAsync({ sub: 'u-coord', rol: Rol.Coordinador });
      const res = await request(app.getHttpServer())
        .patch('/documentos/d1/estado')
        .set('Authorization', `Bearer ${token}`)
        .send({ estado: 'aprobado' });
      expect(res.status).toBe(403);
      expect(documentosFake.actualizarEstado).not.toHaveBeenCalled();
    });

    it('admin_academico aprueba un documento', async () => {
      const token = await jwt.signAsync({ sub: 'u-admin', rol: Rol.AdminAcademico });
      const res = await request(app.getHttpServer())
        .patch('/documentos/d1/estado')
        .set('Authorization', `Bearer ${token}`)
        .send({ estado: 'aprobado' });
      expect(res.status).toBe(200);
      expect(res.body.estado).toBe('aprobado');
      expect(documentosFake.actualizarEstado).toHaveBeenCalledWith('d1', 'aprobado');
    });

    it('con un estado inválido en el body -> 400', async () => {
      const token = await jwt.signAsync({ sub: 'u-admin', rol: Rol.AdminAcademico });
      const res = await request(app.getHttpServer())
        .patch('/documentos/d1/estado')
        .set('Authorization', `Bearer ${token}`)
        .send({ estado: 'en-camino' });
      expect(res.status).toBe(400);
      expect(documentosFake.actualizarEstado).not.toHaveBeenCalled();
    });

    it('documento inexistente -> 404', async () => {
      documentosFake.findById.mockResolvedValue(null);
      const token = await jwt.signAsync({ sub: 'u-admin', rol: Rol.AdminAcademico });
      const res = await request(app.getHttpServer())
        .patch('/documentos/no-existe/estado')
        .set('Authorization', `Bearer ${token}`)
        .send({ estado: 'aprobado' });
      expect(res.status).toBe(404);
    });
  });

  describe('GET /documentos/:id/archivo', () => {
    let dir: string;
    let ruta: string;

    beforeEach(() => {
      dir = mkdtempSync(join(tmpdir(), 'iinicia-documentos-e2e-'));
      ruta = join(dir, 'archivo.pdf');
      writeFileSync(ruta, 'contenido de prueba');
      documentosFake.findById.mockResolvedValue({ ...docBase, rutaArchivo: ruta });
    });

    afterEach(() => rmSync(dir, { recursive: true, force: true }));

    it('sin sesión -> 401', async () => {
      const res = await request(app.getHttpServer()).get('/documentos/d1/archivo');
      expect(res.status).toBe(401);
    });

    it('con rol no autorizado (estudiante) -> 403', async () => {
      const token = await jwt.signAsync({ sub: 'u-estudiante', rol: Rol.Estudiante });
      const res = await request(app.getHttpServer())
        .get('/documentos/d1/archivo')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(403);
    });

    it('admin_academico descarga el archivo real', async () => {
      const token = await jwt.signAsync({ sub: 'u-admin', rol: Rol.AdminAcademico });
      const res = await request(app.getHttpServer())
        .get('/documentos/d1/archivo')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('application/pdf');
      expect(Buffer.isBuffer(res.body) ? res.body.toString() : res.text).toBe('contenido de prueba');
    });

    it('documento inexistente -> 404', async () => {
      documentosFake.findById.mockResolvedValue(null);
      const token = await jwt.signAsync({ sub: 'u-admin', rol: Rol.AdminAcademico });
      const res = await request(app.getHttpServer())
        .get('/documentos/no-existe/archivo')
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(404);
    });
  });
});
