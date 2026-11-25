import { BadRequestException } from '@nestjs/common';
import { AspiranteController } from './aspirante.controller.js';
import { Rol } from '../users/rol.enum.js';
import type { User } from '../users/user.entity.js';
import type { Documento } from '../documentos/documento.entity.js';

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'a1',
    nombre: 'Test',
    correo: 'a@a.com',
    passwordHash: '',
    rol: Rol.Aspirante,
    moodleUserId: null,
    programaInteresId: null,
    programaCoordinadoId: null,
    aceptaAvisoPrivacidad: false,
    deseaInformacionBecas: false,
    fcmToken: null,
    resetPasswordTokenHash: null,
    resetPasswordExpira: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as User;
}

function makeController(user: User, docs: Documento[], documentosOverrides: Record<string, unknown> = {}) {
  const users = { findById: vi.fn().mockResolvedValue(user) };
  const programas = {
    findById: vi.fn().mockResolvedValue(user.programaInteresId ? { nombre: 'Software' } : null),
  };
  const documentos = { listarPorUsuario: vi.fn().mockResolvedValue(docs), ...documentosOverrides };
  return {
    controller: new AspiranteController(users as never, programas as never, documentos as never),
    documentos,
  };
}

const actual = { id: 'a1', nombre: 'Test', correo: 'a@a.com', rol: Rol.Aspirante };

describe('AspiranteController.solicitud', () => {
  it('sin programa ni documentos: solo "cuenta creada" completo', async () => {
    const { controller } = makeController(makeUser(), []);
    const resultado = await controller.solicitud(actual);

    expect(resultado.programaNombre).toBe('Sin programa seleccionado');
    expect(resultado.estado).toBe('en_revision');
    expect(resultado.pasos.map((p) => p.completado)).toEqual([true, false, false, false]);
  });

  it('con programa elegido y un documento subido: 3 de 4 pasos completos', async () => {
    const user = makeUser({ programaInteresId: 'soft' });
    const doc = { id: 'd1', tipo: 'identificacion', estado: 'pendiente' } as Documento;
    const { controller } = makeController(user, [doc]);

    const resultado = await controller.solicitud(actual);

    expect(resultado.programaNombre).toBe('Software');
    expect(resultado.pasos.map((p) => p.completado)).toEqual([true, true, true, false]);
  });

  it('usuario ya promovido a estudiante: dictamen completo y estado admitido', async () => {
    const user = makeUser({ programaInteresId: 'soft', rol: Rol.Estudiante });
    const { controller } = makeController(user, [{ id: 'd1' } as Documento]);

    const resultado = await controller.solicitud(actual);

    expect(resultado.estado).toBe('admitido');
    expect(resultado.pasos.every((p) => p.completado)).toBe(true);
  });
});

describe('AspiranteController.misDocumentos', () => {
  it('devuelve los documentos del aspirante autenticado, mapeados (sin rutaArchivo)', async () => {
    const doc = {
      id: 'd1',
      tipo: 'identificacion',
      nombreOriginal: 'ine.pdf',
      mimeType: 'application/pdf',
      rutaArchivo: '/secreto.pdf',
      estado: 'pendiente',
      createdAt: new Date('2026-01-01'),
    } as Documento;
    const { controller, documentos } = makeController(makeUser(), [doc]);

    const res = await controller.misDocumentos(actual);

    expect(documentos.listarPorUsuario).toHaveBeenCalledWith('a1');
    expect(res).toEqual([
      { id: 'd1', tipo: 'identificacion', nombreOriginal: 'ine.pdf', estado: 'pendiente', createdAt: doc.createdAt },
    ]);
  });
});

describe('AspiranteController.subirDocumento', () => {
  it('sin archivo adjunto, rechaza con 400 sin llamar al servicio', async () => {
    const crear = vi.fn();
    const { controller } = makeController(makeUser(), [], { crear });

    await expect(
      controller.subirDocumento(actual, { tipo: 'identificacion' }, undefined),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(crear).not.toHaveBeenCalled();
  });

  it('con archivo válido, lo guarda asociado al usuario autenticado', async () => {
    const creado = {
      id: 'd1',
      tipo: 'identificacion',
      nombreOriginal: 'ine.pdf',
      mimeType: 'application/pdf',
      rutaArchivo: '/uploads/documentos/x.pdf',
      estado: 'pendiente',
      createdAt: new Date('2026-01-01'),
    } as Documento;
    const crear = vi.fn().mockResolvedValue(creado);
    const { controller } = makeController(makeUser(), [], { crear });
    const archivo = {
      originalname: 'ine.pdf',
      mimetype: 'application/pdf',
      path: '/uploads/documentos/x.pdf',
    } as Express.Multer.File;

    const res = await controller.subirDocumento(actual, { tipo: 'identificacion' }, archivo);

    expect(crear).toHaveBeenCalledWith({
      userId: 'a1',
      tipo: 'identificacion',
      nombreOriginal: 'ine.pdf',
      mimeType: 'application/pdf',
      rutaArchivo: '/uploads/documentos/x.pdf',
    });
    expect(res.estado).toBe('pendiente');
    expect(res).not.toHaveProperty('rutaArchivo');
  });
});
