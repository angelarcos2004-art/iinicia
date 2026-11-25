import { NotFoundException } from '@nestjs/common';
import { DocumentosService, mapearDocumento } from './documentos.service.js';
import type { Documento } from './documento.entity.js';

function makeRepo(doc: Documento | null) {
  return {
    create: vi.fn().mockImplementation((data) => data),
    save: vi.fn().mockImplementation(async (data) => ({ id: 'd1', createdAt: new Date(), ...data })),
    find: vi.fn().mockResolvedValue(doc ? [doc] : []),
    findOne: vi.fn().mockResolvedValue(doc),
    update: vi.fn().mockResolvedValue(undefined),
  };
}

describe('DocumentosService', () => {
  it('crear guarda el documento con estado "pendiente"', async () => {
    const repo = makeRepo(null);
    const service = new DocumentosService(repo as never);

    const doc = await service.crear({
      userId: 'u1',
      tipo: 'identificacion',
      nombreOriginal: 'ine.pdf',
      mimeType: 'application/pdf',
      rutaArchivo: '/uploads/documentos/x.pdf',
    });

    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'u1', tipo: 'identificacion', estado: 'pendiente' }),
    );
    expect(doc.estado).toBe('pendiente');
  });

  it('listarPorUsuario devuelve los documentos de ese usuario, más reciente primero', async () => {
    const doc = { id: 'd1', userId: 'u1' } as Documento;
    const repo = makeRepo(doc);
    const service = new DocumentosService(repo as never);

    const docs = await service.listarPorUsuario('u1');

    expect(repo.find).toHaveBeenCalledWith({ where: { userId: 'u1' }, order: { createdAt: 'DESC' } });
    expect(docs).toEqual([doc]);
  });

  it('findById devuelve null si no existe', async () => {
    const repo = makeRepo(null);
    const service = new DocumentosService(repo as never);

    expect(await service.findById('no-existe')).toBeNull();
  });

  it('actualizarEstado guarda el nuevo estado y devuelve el documento actualizado', async () => {
    const doc = { id: 'd1', estado: 'aprobado' } as Documento;
    const repo = makeRepo(doc);
    const service = new DocumentosService(repo as never);

    const actualizado = await service.actualizarEstado('d1', 'aprobado');

    expect(repo.update).toHaveBeenCalledWith('d1', { estado: 'aprobado' });
    expect(actualizado).toEqual(doc);
  });

  it('actualizarEstado lanza 404 si el documento no existe', async () => {
    const repo = makeRepo(null);
    const service = new DocumentosService(repo as never);

    await expect(service.actualizarEstado('no-existe', 'rechazado')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});

describe('mapearDocumento', () => {
  it('nunca incluye rutaArchivo (no se expone la ruta en disco al cliente)', () => {
    const doc = {
      id: 'd1',
      tipo: 'identificacion',
      nombreOriginal: 'ine.pdf',
      mimeType: 'application/pdf',
      rutaArchivo: '/uploads/documentos/secreto.pdf',
      estado: 'pendiente',
      createdAt: new Date('2026-01-01'),
    } as Documento;

    const mapeado = mapearDocumento(doc);

    expect(mapeado).toEqual({
      id: 'd1',
      tipo: 'identificacion',
      nombreOriginal: 'ine.pdf',
      estado: 'pendiente',
      createdAt: doc.createdAt,
    });
    expect(mapeado).not.toHaveProperty('rutaArchivo');
  });
});
