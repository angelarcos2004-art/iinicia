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

describe('UsuariosController.notificar (control de acceso)', () => {
  function makeNotificarController(opts: {
    porId: Record<string, User | null>;
    cursosDeUsuario?: { id: number; fullname: string }[];
    estudiantesDeCurso?: { email: string; fullname: string }[];
    porCorreo?: Record<string, User | null>;
  }) {
    const users = {
      findById: vi.fn((id: string) => Promise.resolve(opts.porId[id] ?? null)),
      findByCorreo: vi.fn((correo: string) => Promise.resolve(opts.porCorreo?.[correo] ?? null)),
    };
    const moodle = {
      obtenerCursosDeUsuario: vi.fn().mockResolvedValue(opts.cursosDeUsuario ?? []),
      obtenerEstudiantesDeCurso: vi.fn().mockResolvedValue(opts.estudiantesDeCurso ?? []),
    };
    const push = { enviar: vi.fn().mockResolvedValue(undefined) };
    const controller = new UsuariosController(
      users as never,
      moodle as never,
      {} as never,
      push as never,
      {} as never,
      {} as never,
    );
    return { controller, push };
  }

  const DTO = { titulo: 'Aviso', mensaje: 'Tu tarea está casi vencida.' };

  it('un coordinador NO puede notificar a un usuario de otro programa (IDOR)', async () => {
    const coordinador = makeUser({ id: 'coord', rol: Rol.Coordinador, programaCoordinadoId: 'soft' });
    const objetivo = makeUser({ id: 'e2', programaInteresId: 'neg', fcmToken: 'tok' });
    const { controller, push } = makeNotificarController({ porId: { coord: coordinador, e2: objetivo } });

    await expect(
      controller.notificar({ id: 'coord', nombre: 'Coord', correo: 'coord@a.com', rol: Rol.Coordinador }, 'e2', DTO),
    ).rejects.toThrow();
    expect(push.enviar).not.toHaveBeenCalled();
  });

  it('un coordinador sí puede notificar a un usuario de su propio programa', async () => {
    const coordinador = makeUser({ id: 'coord', rol: Rol.Coordinador, programaCoordinadoId: 'soft' });
    const objetivo = makeUser({ id: 'e1', programaInteresId: 'soft', fcmToken: 'tok' });
    const { controller, push } = makeNotificarController({ porId: { coord: coordinador, e1: objetivo } });

    await controller.notificar(
      { id: 'coord', nombre: 'Coord', correo: 'coord@a.com', rol: Rol.Coordinador },
      'e1',
      DTO,
    );

    expect(push.enviar).toHaveBeenCalledWith('tok', DTO.titulo, DTO.mensaje, undefined);
  });

  it('un profesor NO puede notificar a un estudiante que no está en sus cursos reales (IDOR)', async () => {
    const profesor = makeUser({ id: 'prof', rol: Rol.Profesor, moodleUserId: 7 });
    const ajeno = makeUser({ id: 'e9', fcmToken: 'tok' });
    const { controller, push } = makeNotificarController({
      porId: { prof: profesor, e9: ajeno },
      cursosDeUsuario: [{ id: 1, fullname: 'IA' }],
      estudiantesDeCurso: [{ email: 'otro@correo.com', fullname: 'Otro' }],
    });

    await expect(
      controller.notificar({ id: 'prof', nombre: 'Prof', correo: 'prof@a.com', rol: Rol.Profesor }, 'e9', DTO),
    ).rejects.toThrow();
    expect(push.enviar).not.toHaveBeenCalled();
  });

  it('un profesor sí puede notificar a un estudiante real de sus cursos', async () => {
    const profesor = makeUser({ id: 'prof', rol: Rol.Profesor, moodleUserId: 7 });
    const estudiante = makeUser({ id: 'e1', correo: 'luis@correo.com', fcmToken: 'tok' });
    const { controller, push } = makeNotificarController({
      porId: { prof: profesor, e1: estudiante },
      cursosDeUsuario: [{ id: 1, fullname: 'IA' }],
      estudiantesDeCurso: [{ email: 'luis@correo.com', fullname: 'Luis' }],
      porCorreo: { 'luis@correo.com': estudiante },
    });

    await controller.notificar(
      { id: 'prof', nombre: 'Prof', correo: 'prof@a.com', rol: Rol.Profesor },
      'e1',
      DTO,
    );

    expect(push.enviar).toHaveBeenCalledWith('tok', DTO.titulo, DTO.mensaje, undefined);
  });
});
