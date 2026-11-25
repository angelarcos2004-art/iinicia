import type { ConfigService } from '@nestjs/config';
import { vincularYMatricularMoodle } from './moodle-onboarding.js';
import type { MoodleService } from './moodle.service.js';
import type { User } from '../users/user.entity.js';
import type { UsersService } from '../users/users.service.js';

function makeUser(overrides: Partial<User> = {}): User {
  return { id: 'u1', correo: 'ana@correo.com', nombre: 'Ana', moodleUserId: null, ...overrides } as User;
}

function makeDeps(opts: {
  buscarOCrearUsuarioMoodle?: ReturnType<typeof vi.fn>;
  matricularEnCurso?: ReturnType<typeof vi.fn>;
  moodleTestCourse?: string;
} = {}) {
  const users = { actualizarMoodleUserId: vi.fn().mockResolvedValue(undefined) };
  const moodle = {
    buscarOCrearUsuarioMoodle: opts.buscarOCrearUsuarioMoodle ?? vi.fn().mockResolvedValue(42),
    matricularEnCurso: opts.matricularEnCurso ?? vi.fn().mockResolvedValue(undefined),
  };
  const config = {
    get: (key: string, def?: string) => (key === 'MOODLE_TEST_COURSE' ? (opts.moodleTestCourse ?? def) : def),
  } as unknown as ConfigService;
  const logger = { warn: vi.fn() };
  return {
    deps: { users: users as unknown as UsersService, moodle: moodle as unknown as MoodleService, config, logger },
    users,
    moodle,
    logger,
  };
}

describe('vincularYMatricularMoodle', () => {
  it('vincula la cuenta de Moodle, guarda el moodleUserId y matricula en el curso dado', async () => {
    const { deps, users, moodle } = makeDeps();
    const user = makeUser();

    const resultado = await vincularYMatricularMoodle(deps, user, 'IINICIA-SOFT1');

    expect(users.actualizarMoodleUserId).toHaveBeenCalledWith('u1', 42);
    expect(moodle.matricularEnCurso).toHaveBeenCalledWith(42, 'IINICIA-SOFT1');
    expect(resultado.moodleUserId).toBe(42);
  });

  it('sin un curso explícito, usa MOODLE_TEST_COURSE (o "IINICIA101" si tampoco está configurado)', async () => {
    const { deps, moodle } = makeDeps();

    await vincularYMatricularMoodle(deps, makeUser(), null);

    expect(moodle.matricularEnCurso).toHaveBeenCalledWith(42, 'IINICIA101');
  });

  it('respeta MOODLE_TEST_COURSE cuando no se da un curso explícito', async () => {
    const { deps, moodle } = makeDeps({ moodleTestCourse: 'IINICIA-CIBER1' });

    await vincularYMatricularMoodle(deps, makeUser());

    expect(moodle.matricularEnCurso).toHaveBeenCalledWith(42, 'IINICIA-CIBER1');
  });

  it('si falla la matrícula pero la cuenta ya se vinculó, no lanza: devuelve el usuario con moodleUserId igual', async () => {
    const { deps, logger, users } = makeDeps({
      matricularEnCurso: vi.fn().mockRejectedValue(new Error('curso lleno')),
    });

    const resultado = await vincularYMatricularMoodle(deps, makeUser(), 'IINICIA101');

    expect(users.actualizarMoodleUserId).toHaveBeenCalled(); // la cuenta sí quedó vinculada
    expect(resultado.moodleUserId).toBe(42);
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('No se pudo matricular'));
  });

  it('si falla vincular la cuenta de Moodle, no lanza: devuelve el usuario sin tocar moodleUserId', async () => {
    const { deps, logger, users } = makeDeps({
      buscarOCrearUsuarioMoodle: vi.fn().mockRejectedValue(new Error('Moodle caído')),
    });
    const user = makeUser();

    const resultado = await vincularYMatricularMoodle(deps, user);

    expect(users.actualizarMoodleUserId).not.toHaveBeenCalled();
    expect(resultado.moodleUserId).toBeNull();
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('No se pudo vincular a Moodle'));
  });
});
