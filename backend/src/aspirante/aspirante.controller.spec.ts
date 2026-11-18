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

function makeController(user: User, docs: Documento[]) {
  const users = { findById: vi.fn().mockResolvedValue(user) };
  const programas = {
    findById: vi.fn().mockResolvedValue(user.programaInteresId ? { nombre: 'Software' } : null),
  };
  const documentos = { listarPorUsuario: vi.fn().mockResolvedValue(docs) };
  return new AspiranteController(users as never, programas as never, documentos as never);
}

const actual = { id: 'a1', nombre: 'Test', correo: 'a@a.com', rol: Rol.Aspirante };

describe('AspiranteController.solicitud', () => {
  it('sin programa ni documentos: solo "cuenta creada" completo', async () => {
    const controller = makeController(makeUser(), []);
    const resultado = await controller.solicitud(actual);

    expect(resultado.programaNombre).toBe('Sin programa seleccionado');
    expect(resultado.estado).toBe('en_revision');
    expect(resultado.pasos.map((p) => p.completado)).toEqual([true, false, false, false]);
  });

  it('con programa elegido y un documento subido: 3 de 4 pasos completos', async () => {
    const user = makeUser({ programaInteresId: 'soft' });
    const doc = { id: 'd1', tipo: 'identificacion', estado: 'pendiente' } as Documento;
    const controller = makeController(user, [doc]);

    const resultado = await controller.solicitud(actual);

    expect(resultado.programaNombre).toBe('Software');
    expect(resultado.pasos.map((p) => p.completado)).toEqual([true, true, true, false]);
  });

  it('usuario ya promovido a estudiante: dictamen completo y estado admitido', async () => {
    const user = makeUser({ programaInteresId: 'soft', rol: Rol.Estudiante });
    const controller = makeController(user, [{ id: 'd1' } as Documento]);

    const resultado = await controller.solicitud(actual);

    expect(resultado.estado).toBe('admitido');
    expect(resultado.pasos.every((p) => p.completado)).toBe(true);
  });
});
