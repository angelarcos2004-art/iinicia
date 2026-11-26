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

  it('404 si el usuario a notificar no existe', async () => {
    const { controller } = makeNotificarController({ porId: {} });

    await expect(
      controller.notificar(
        { id: 'admin', nombre: 'Admin', correo: 'a@a.com', rol: Rol.AdminAcademico },
        'fantasma',
        DTO,
      ),
    ).rejects.toThrow('Usuario no encontrado');
  });

  it('400 si el destinatario no tiene dispositivo registrado', async () => {
    const sinToken = makeUser({ id: 'e1', fcmToken: null });
    const { controller, push } = makeNotificarController({ porId: { e1: sinToken } });

    await expect(
      controller.notificar(
        { id: 'admin', nombre: 'Admin', correo: 'a@a.com', rol: Rol.AdminAcademico },
        'e1',
        DTO,
      ),
    ).rejects.toThrow('no tiene un dispositivo registrado');
    expect(push.enviar).not.toHaveBeenCalled();
  });
});

describe('UsuariosController.misEstudiantes / listarCursosMoodle', () => {
  it('misEstudiantes devuelve [] si el profesor autenticado ya no existe', async () => {
    const users = { findById: vi.fn().mockResolvedValue(null) };
    const controller = new UsuariosController(
      users as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );

    const resultado = await controller.misEstudiantes({
      id: 'prof',
      nombre: 'Prof',
      correo: 'p@a.com',
      rol: Rol.Profesor,
    });

    expect(resultado).toEqual([]);
  });

  it('listarCursosMoodle delega en MoodleService.listarCursos', async () => {
    const cursos = [{ id: 1, fullname: 'IA', shortname: 'ia' }];
    const moodle = { listarCursos: vi.fn().mockResolvedValue(cursos) };
    const controller = new UsuariosController(
      {} as never,
      moodle as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );

    await expect(controller.listarCursosMoodle()).resolves.toBe(cursos);
  });
});

describe('UsuariosController.asignarProgramaCoordinado', () => {
  function makeController(usuario: User | null) {
    const users = {
      findById: vi.fn().mockResolvedValue(usuario),
      actualizarProgramaCoordinado: vi.fn().mockResolvedValue(undefined),
    };
    const programas = {
      findById: vi.fn((id: string) => Promise.resolve(id === 'soft' ? { id: 'soft', nombre: 'Software' } : null)),
    };
    const controller = new UsuariosController(
      users as never,
      {} as never,
      {} as never,
      {} as never,
      programas as never,
      {} as never,
    );
    return { controller, users };
  }

  it('404 si el usuario no existe', async () => {
    const { controller } = makeController(null);
    await expect(controller.asignarProgramaCoordinado('x', { programaId: 'soft' })).rejects.toThrow(
      'Usuario no encontrado',
    );
  });

  it('400 si el usuario no es coordinador', async () => {
    const { controller } = makeController(makeUser({ rol: Rol.Profesor }));
    await expect(controller.asignarProgramaCoordinado('x', { programaId: 'soft' })).rejects.toThrow(
      'Solo los coordinadores',
    );
  });

  it('400 si el programa no existe', async () => {
    const { controller } = makeController(makeUser({ rol: Rol.Coordinador }));
    await expect(controller.asignarProgramaCoordinado('x', { programaId: 'no-existe' })).rejects.toThrow(
      'Programa no encontrado',
    );
  });

  it('asigna el ámbito y lo refleja en la respuesta', async () => {
    const { controller, users } = makeController(makeUser({ id: 'coord', rol: Rol.Coordinador }));

    const resultado = await controller.asignarProgramaCoordinado('coord', { programaId: 'soft' });

    expect(users.actualizarProgramaCoordinado).toHaveBeenCalledWith('coord', 'soft');
    expect(resultado.programaCoordinadoId).toBe('soft');
    expect(resultado.programaCoordinadoNombre).toBe('Software');
  });

  it('programaId null quita el ámbito', async () => {
    const { controller, users } = makeController(makeUser({ id: 'coord', rol: Rol.Coordinador }));

    const resultado = await controller.asignarProgramaCoordinado('coord', { programaId: null });

    expect(users.actualizarProgramaCoordinado).toHaveBeenCalledWith('coord', null);
    expect(resultado.programaCoordinadoId).toBeNull();
  });
});

describe('UsuariosController.actualizarRol', () => {
  it('404 si el usuario no existe', async () => {
    const users = { findById: vi.fn().mockResolvedValue(null) };
    const controller = new UsuariosController(
      users as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );

    await expect(controller.actualizarRol('x', { rol: Rol.Estudiante })).rejects.toThrow(
      'Usuario no encontrado',
    );
  });

  it('cambia el rol sin tocar Moodle si el usuario ya tiene cuenta vinculada', async () => {
    const existente = makeUser({ id: 'u1', rol: Rol.Aspirante, moodleUserId: 42 });
    const users = {
      findById: vi.fn().mockResolvedValue(existente),
      actualizarRol: vi.fn().mockResolvedValue(undefined),
    };
    const moodle = { buscarOCrearUsuarioMoodle: vi.fn() };
    const controller = new UsuariosController(
      users as never,
      moodle as never,
      {} as never,
      {} as never,
      {} as never,
      {} as never,
    );

    const resultado = await controller.actualizarRol('u1', { rol: Rol.Estudiante });

    expect(users.actualizarRol).toHaveBeenCalledWith('u1', Rol.Estudiante);
    expect(moodle.buscarOCrearUsuarioMoodle).not.toHaveBeenCalled();
    expect(resultado.rol).toBe(Rol.Estudiante);
  });

  it('al admitir como estudiante sin cuenta Moodle previa, vincula y matricula', async () => {
    const existente = makeUser({ id: 'u1', rol: Rol.Aspirante, moodleUserId: null, programaInteresId: 'soft' });
    const users = {
      findById: vi.fn().mockResolvedValue(existente),
      actualizarRol: vi.fn().mockResolvedValue(undefined),
      actualizarMoodleUserId: vi.fn().mockResolvedValue(undefined),
    };
    const moodle = {
      buscarOCrearUsuarioMoodle: vi.fn().mockResolvedValue(99),
      matricularEnCurso: vi.fn().mockResolvedValue(undefined),
    };
    const programas = {
      obtenerMoodleCourseShortname: vi.fn().mockResolvedValue('soft-101'),
    };
    const config = { get: vi.fn().mockReturnValue('IINICIA101') };
    const controller = new UsuariosController(
      users as never,
      moodle as never,
      config as never,
      {} as never,
      programas as never,
      {} as never,
    );

    const resultado = await controller.actualizarRol('u1', { rol: Rol.Estudiante });

    expect(moodle.buscarOCrearUsuarioMoodle).toHaveBeenCalledWith(existente.correo, existente.nombre);
    expect(moodle.matricularEnCurso).toHaveBeenCalledWith(99, 'soft-101');
    expect(resultado.id).toBe('u1');
  });
});

describe('UsuariosController.asignarCurso', () => {
  function makeController(usuario: User | null, verificarPrerequisitos = vi.fn().mockResolvedValue(undefined)) {
    const users = {
      findById: vi.fn().mockResolvedValue(usuario),
      actualizarMoodleUserId: vi.fn().mockResolvedValue(undefined),
    };
    const moodle = {
      buscarOCrearUsuarioMoodle: vi.fn().mockResolvedValue(7),
      matricularEnCurso: vi.fn().mockResolvedValue(undefined),
    };
    const materias = { verificarPrerequisitos };
    const config = { get: vi.fn().mockReturnValue('IINICIA101') };
    const controller = new UsuariosController(
      users as never,
      moodle as never,
      config as never,
      {} as never,
      {} as never,
      materias as never,
    );
    return { controller, moodle, verificarPrerequisitos };
  }

  it('404 si el usuario no existe', async () => {
    const { controller } = makeController(null);
    await expect(controller.asignarCurso('x', { cursoShortname: 'ia' })).rejects.toThrow(
      'Usuario no encontrado',
    );
  });

  it('400 si el usuario no es aspirante ni estudiante', async () => {
    const { controller } = makeController(makeUser({ rol: Rol.Profesor }));
    await expect(controller.asignarCurso('x', { cursoShortname: 'ia' })).rejects.toThrow(
      'Solo aspirantes o estudiantes',
    );
  });

  it('bloquea la matrícula si faltan prerequisitos', async () => {
    const bloqueado = vi.fn().mockRejectedValue(new Error('falta aprobar X'));
    const { controller, moodle } = makeController(makeUser({ rol: Rol.Estudiante }), bloqueado);

    await expect(controller.asignarCurso('u1', { cursoShortname: 'ia' })).rejects.toThrow('falta aprobar X');
    expect(moodle.buscarOCrearUsuarioMoodle).not.toHaveBeenCalled();
  });

  it('matricula cuando no hay prerequisitos pendientes', async () => {
    const { controller, moodle, verificarPrerequisitos } = makeController(
      makeUser({ id: 'u1', rol: Rol.Estudiante }),
    );

    const resultado = await controller.asignarCurso('u1', { cursoShortname: 'ia' });

    expect(verificarPrerequisitos).toHaveBeenCalled();
    expect(moodle.matricularEnCurso).toHaveBeenCalledWith(7, 'ia');
    expect(resultado.id).toBe('u1');
  });
});
