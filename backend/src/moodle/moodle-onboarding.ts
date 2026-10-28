import type { ConfigService } from '@nestjs/config';
import type { User } from '../users/user.entity.js';
import type { UsersService } from '../users/users.service.js';
import type { MoodleService } from './moodle.service.js';

interface OnboardingLogger {
  warn(message: string): void;
}

interface OnboardingDeps {
  users: UsersService;
  moodle: MoodleService;
  config: ConfigService;
  logger: OnboardingLogger;
}

/**
 * Vincula (o crea, de forma idempotente) la cuenta Moodle del usuario y lo matricula en un
 * curso. `courseShortnameOverride` es el curso del programa de interés del usuario (ver
 * ProgramasService.obtenerMoodleCourseShortname); si el programa no tiene uno asignado
 * todavía, se usa MOODLE_TEST_COURSE (default IINICIA101) como respaldo.
 * Nunca lanza: si Moodle no responde, el usuario sigue existiendo en
 * IINICIA con moodleUserId en null (o sin matrícula) para reintentarse
 * después. Compartido entre AuthService (alta/login) y UsuariosController
 * (admisión: promoción de rol a estudiante) para no duplicar esta lógica.
 */
export async function vincularYMatricularMoodle(
  { users, moodle, config, logger }: OnboardingDeps,
  user: User,
  courseShortnameOverride?: string | null,
): Promise<User> {
  try {
    const moodleUserId = await moodle.buscarOCrearUsuarioMoodle(user.correo, user.nombre);
    await users.actualizarMoodleUserId(user.id, moodleUserId);
    user.moodleUserId = moodleUserId;

    const curso = courseShortnameOverride ?? config.get<string>('MOODLE_TEST_COURSE', 'IINICIA101');
    try {
      await moodle.matricularEnCurso(moodleUserId, curso);
    } catch (error) {
      logger.warn(`No se pudo matricular al usuario ${user.id} en el curso ${curso}: ${String(error)}`);
    }
    return user;
  } catch (error) {
    logger.warn(`No se pudo vincular a Moodle el usuario ${user.id}: ${String(error)}`);
    return user;
  }
}
