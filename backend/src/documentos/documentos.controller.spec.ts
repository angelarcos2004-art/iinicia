import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PassThrough } from 'node:stream';
import { Rol } from '../users/rol.enum.js';
import type { UsuarioAutenticado } from '../auth/jwt.strategy.js';
import { DocumentosController } from './documentos.controller.js';
import type { Documento } from './documento.entity.js';

const SUPERADMIN: UsuarioAutenticado = { id: 'admin1', nombre: 'Admin', correo: 'admin@iinicia.org', rol: Rol.Superadmin };

function makeCoordinador(id: string): UsuarioAutenticado {
  return { id, nombre: 'Coordi', correo: 'coordi@iinicia.org', rol: Rol.Coordinador };
}

function makeController(
  docs: Partial<DocumentosServiceFake> = {},
  usersOverrides: Partial<UsersServiceFake> = {},
) {
  const documentos = {
    listarPorUsuario: vi.fn().mockResolvedValue([]),
    findById: vi.fn().mockResolvedValue(null),
    actualizarEstado: vi.fn(),
    crear: vi.fn(),
    ...docs,
  };
  const users = {
    findById: vi.fn().mockResolvedValue(null),
    ...usersOverrides,
  };
  return { controller: new DocumentosController(documentos as never, users as never), documentos, users };
}

// Solo para tipar los helpers de arriba sin importar las clases reales (evita un ciclo de import).
type DocumentosServiceFake = {
  listarPorUsuario: (userId: string) => Promise<Documento[]>;
  findById: (id: string) => Promise<Documento | null>;
  actualizarEstado: (id: string, estado: string) => Promise<Documento>;
  crear: (data: unknown) => Promise<Documento>;
};
type UsersServiceFake = {
  findById: (id: string) => Promise<{ id: string; programaInteresId: string | null; programaCoordinadoId: string | null } | null>;
};

describe('DocumentosController.listarDeUsuario', () => {
  it('devuelve los documentos del usuario, sin exponer rutaArchivo', async () => {
    const doc = {
      id: 'd1',
      tipo: 'identificacion',
      nombreOriginal: 'ine.pdf',
      mimeType: 'application/pdf',
      rutaArchivo: '/secreto.pdf',
      estado: 'pendiente',
      createdAt: new Date('2026-01-01'),
    } as Documento;
    const { controller, documentos } = makeController(
      { listarPorUsuario: vi.fn().mockResolvedValue([doc]) },
      { findById: vi.fn().mockResolvedValue({ id: 'u1', programaInteresId: 'prog-a', programaCoordinadoId: null }) },
    );

    const res = await controller.listarDeUsuario(SUPERADMIN, 'u1');

    expect(documentos.listarPorUsuario).toHaveBeenCalledWith('u1');
    expect(res).toEqual([
      { id: 'd1', tipo: 'identificacion', nombreOriginal: 'ine.pdf', estado: 'pendiente', createdAt: doc.createdAt },
    ]);
  });

  it('un coordinador con ámbito puede ver documentos de usuarios de su propio programa', async () => {
    const coordinador = makeCoordinador('c1');
    const { controller, documentos } = makeController(
      {},
      {
        findById: vi.fn((id: string) =>
          Promise.resolve(
            id === 'c1'
              ? { id: 'c1', programaInteresId: null, programaCoordinadoId: 'prog-a' }
              : { id: 'u1', programaInteresId: 'prog-a', programaCoordinadoId: null },
          ),
        ),
      },
    );

    await controller.listarDeUsuario(coordinador, 'u1');

    expect(documentos.listarPorUsuario).toHaveBeenCalledWith('u1');
  });

  it('un coordinador con ámbito NO puede ver documentos de usuarios de otro programa (IDOR)', async () => {
    const coordinador = makeCoordinador('c1');
    const { controller, documentos } = makeController(
      {},
      {
        findById: vi.fn((id: string) =>
          Promise.resolve(
            id === 'c1'
              ? { id: 'c1', programaInteresId: null, programaCoordinadoId: 'prog-a' }
              : { id: 'u2', programaInteresId: 'prog-b', programaCoordinadoId: null },
          ),
        ),
      },
    );

    await expect(controller.listarDeUsuario(coordinador, 'u2')).rejects.toBeInstanceOf(ForbiddenException);
    expect(documentos.listarPorUsuario).not.toHaveBeenCalled();
  });
});

describe('DocumentosController.revisar', () => {
  it('lanza 404 si el documento no existe', async () => {
    const { controller } = makeController({ findById: vi.fn().mockResolvedValue(null) });

    await expect(controller.revisar('no-existe', { estado: 'aprobado' })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('con el documento existente, lo actualiza y devuelve la versión mapeada', async () => {
    const existente = { id: 'd1' } as Documento;
    const actualizado = {
      id: 'd1',
      tipo: 'identificacion',
      nombreOriginal: 'ine.pdf',
      mimeType: 'application/pdf',
      rutaArchivo: '/x.pdf',
      estado: 'aprobado',
      createdAt: new Date(),
    } as Documento;
    const { controller, documentos } = makeController({
      findById: vi.fn().mockResolvedValue(existente),
      actualizarEstado: vi.fn().mockResolvedValue(actualizado),
    });

    const res = await controller.revisar('d1', { estado: 'aprobado' });

    expect(documentos.actualizarEstado).toHaveBeenCalledWith('d1', 'aprobado');
    expect(res.estado).toBe('aprobado');
  });
});

describe('DocumentosController.descargar', () => {
  it('lanza 404 si el documento no existe', async () => {
    const { controller } = makeController({ findById: vi.fn().mockResolvedValue(null) });
    const res = { setHeader: vi.fn() };

    await expect(controller.descargar(SUPERADMIN, 'no-existe', res as never)).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('con el documento existente, transmite el archivo con los headers correctos', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'iinicia-documentos-'));
    const ruta = join(dir, 'archivo.pdf');
    writeFileSync(ruta, 'contenido de prueba');
    try {
      const doc = {
        id: 'd1',
        userId: 'u1',
        nombreOriginal: 'identificación válida.pdf',
        mimeType: 'application/pdf',
        rutaArchivo: ruta,
      } as Documento;
      const { controller } = makeController(
        { findById: vi.fn().mockResolvedValue(doc) },
        { findById: vi.fn().mockResolvedValue({ id: 'u1', programaInteresId: 'prog-a', programaCoordinadoId: null }) },
      );
      const setHeader = vi.fn();
      const res = Object.assign(new PassThrough(), { setHeader });
      const recibido: Buffer[] = [];
      res.on('data', (chunk) => recibido.push(chunk as Buffer));
      const fin = new Promise<void>((resolve) => res.on('end', resolve));

      await controller.descargar(SUPERADMIN, 'd1', res as never);
      await fin;

      expect(setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
      expect(setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        expect.stringContaining('identificaci'),
      );
      expect(Buffer.concat(recibido).toString()).toBe('contenido de prueba');
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('un coordinador con ámbito NO puede descargar el archivo de un usuario de otro programa (IDOR)', async () => {
    const coordinador = makeCoordinador('c1');
    const doc = {
      id: 'd1',
      userId: 'u2',
      nombreOriginal: 'ine.pdf',
      mimeType: 'application/pdf',
      rutaArchivo: '/no-deberia-leerse.pdf',
    } as Documento;
    const { controller } = makeController(
      { findById: vi.fn().mockResolvedValue(doc) },
      {
        findById: vi.fn((id: string) =>
          Promise.resolve(
            id === 'c1'
              ? { id: 'c1', programaInteresId: null, programaCoordinadoId: 'prog-a' }
              : { id: 'u2', programaInteresId: 'prog-b', programaCoordinadoId: null },
          ),
        ),
      },
    );
    const res = { setHeader: vi.fn() };

    await expect(controller.descargar(coordinador, 'd1', res as never)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(res.setHeader).not.toHaveBeenCalled();
  });
});
