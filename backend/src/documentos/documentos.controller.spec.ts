import { NotFoundException } from '@nestjs/common';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PassThrough } from 'node:stream';
import { DocumentosController } from './documentos.controller.js';
import type { Documento } from './documento.entity.js';

function makeController(docs: Partial<DocumentosService> = {}) {
  const documentos = {
    listarPorUsuario: vi.fn().mockResolvedValue([]),
    findById: vi.fn().mockResolvedValue(null),
    actualizarEstado: vi.fn(),
    crear: vi.fn(),
    ...docs,
  };
  return { controller: new DocumentosController(documentos as never), documentos };
}

// Solo para tipar el helper de arriba sin importar la clase real (evita un ciclo de import).
type DocumentosService = {
  listarPorUsuario: (userId: string) => Promise<Documento[]>;
  findById: (id: string) => Promise<Documento | null>;
  actualizarEstado: (id: string, estado: string) => Promise<Documento>;
  crear: (data: unknown) => Promise<Documento>;
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
    const { controller, documentos } = makeController({ listarPorUsuario: vi.fn().mockResolvedValue([doc]) });

    const res = await controller.listarDeUsuario('u1');

    expect(documentos.listarPorUsuario).toHaveBeenCalledWith('u1');
    expect(res).toEqual([
      { id: 'd1', tipo: 'identificacion', nombreOriginal: 'ine.pdf', estado: 'pendiente', createdAt: doc.createdAt },
    ]);
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

    await expect(controller.descargar('no-existe', res as never)).rejects.toBeInstanceOf(
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
        nombreOriginal: 'identificación válida.pdf',
        mimeType: 'application/pdf',
        rutaArchivo: ruta,
      } as Documento;
      const { controller } = makeController({ findById: vi.fn().mockResolvedValue(doc) });
      const setHeader = vi.fn();
      const res = Object.assign(new PassThrough(), { setHeader });
      const recibido: Buffer[] = [];
      res.on('data', (chunk) => recibido.push(chunk as Buffer));
      const fin = new Promise<void>((resolve) => res.on('end', resolve));

      await controller.descargar('d1', res as never);
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
});
