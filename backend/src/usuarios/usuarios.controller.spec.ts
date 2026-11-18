import { UsuariosController } from './usuarios.controller.js';
import { Rol } from '../users/rol.enum.js';
import type { User } from '../users/user.entity.js';

function makeUser(overrides: Partial<User> = {}): User {
  return {
    id: 'u1',
    nombre: 'Test',
    correo: 'a@a.com',
    passwordHash: '',
    rol: Rol.Estudiante,
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

function makeController(usuarios: User[], coordinador: User | null) {
  const users = {
    listar: vi.fn().mockResolvedValue(usuarios),
    findById: vi.fn().mockResolvedValue(coordinador),
  };
  const programas = {
    listar: vi.fn().mockResolvedValue([
      { id: 'soft', nombre: 'Software' },
      { id: 'neg', nombre: 'Negocios' },
    ]),
  };
  return new UsuariosController(
    users as never,
    {} as never,
    {} as never,
    {} as never,
    programas as never,
    {} as never,
  );
}

describe('UsuariosController.listar (ámbito de coordinador)', () => {
  const estudianteSoft = makeUser({ id: 'e1', programaInteresId: 'soft' });
  const estudianteNeg = makeUser({ id: 'e2', programaInteresId: 'neg' });

  it('coordinador con ámbito asignado solo ve usuarios de su programa', async () => {
    const coordinador = makeUser({ id: 'coord', rol: Rol.Coordinador, programaCoordinadoId: 'soft' });
    const controller = makeController([estudianteSoft, estudianteNeg], coordinador);

    const resultado = await controller.listar({
      id: 'coord',
      nombre: 'Coord',
      correo: 'coord@a.com',
      rol: Rol.Coordinador,
    });

    expect(resultado.map((u) => u.id)).toEqual(['e1']);
  });

  it('coordinador sin ámbito ve a todos, como hoy', async () => {
    const coordinador = makeUser({ id: 'coord', rol: Rol.Coordinador, programaCoordinadoId: null });
    const controller = makeController([estudianteSoft, estudianteNeg], coordinador);

    const resultado = await controller.listar({
      id: 'coord',
      nombre: 'Coord',
      correo: 'coord@a.com',
      rol: Rol.Coordinador,
    });

    expect(resultado.map((u) => u.id)).toEqual(['e1', 'e2']);
  });

  it('admin_academico ve a todos sin filtrar por ningún ámbito', async () => {
    const controller = makeController([estudianteSoft, estudianteNeg], null);

    const resultado = await controller.listar({
      id: 'admin',
      nombre: 'Admin',
      correo: 'admin@a.com',
      rol: Rol.AdminAcademico,
    });

    expect(resultado.map((u) => u.id)).toEqual(['e1', 'e2']);
  });
});
