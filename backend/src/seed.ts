import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import { AppModule } from './app.module.js';
import type { Materia } from './materias/materia.entity.js';
import { MateriasService } from './materias/materias.service.js';
import { vincularYMatricularMoodle } from './moodle/moodle-onboarding.js';
import { MoodleService } from './moodle/moodle.service.js';
import type { Programa } from './programas/programa.entity.js';
import { ProgramasService } from './programas/programas.service.js';
import { Rol } from './users/rol.enum.js';
import { UsersService } from './users/users.service.js';

/**
 * Mismo catálogo que frontend/lib/mock-data.ts (MOCK_PROGRAMAS), para que ambos muestren lo
 * mismo en cuanto el portal consuma GET /programas en vez de sus datos de ejemplo. El primero
 * ya tiene curso de Moodle asignado (el curso de prueba real); el resto queda sin asignar a
 * propósito, para demostrar el respaldo a MOODLE_TEST_COURSE en moodle-onboarding.ts.
 */
const PROGRAMAS_SEMILLA: Programa[] = [
  {
    id: 'lic-software-ia',
    tipo: 'licenciatura',
    nombre: 'Ingeniería de Software e Inteligencia Artificial',
    descripcion: 'Forma parte de la próxima generación de ingenieros especializados en IA aplicada.',
    duracion: '12 cuatrimestres',
    modalidad: 'en_linea',
    moodleCourseShortname: 'IINICIA101',
  },
  {
    id: 'lic-admon-negocios',
    tipo: 'licenciatura',
    nombre: 'Administración de Negocios Digitales',
    descripcion: 'Desarrolla modelos de negocio y estrategias digitales para empresas en crecimiento.',
    duracion: '12 cuatrimestres',
    modalidad: 'en_linea',
    moodleCourseShortname: null,
  },
  {
    id: 'dip-cloud-kubernetes',
    tipo: 'diplomado',
    nombre: 'Cloud Architecture & Kubernetes',
    descripcion: 'Diseña e implementa arquitecturas en la nube listas para producción.',
    duracion: '4 meses',
    modalidad: 'en_linea',
    moodleCourseShortname: null,
  },
  {
    id: 'dip-gestion-proyectos',
    tipo: 'diplomado',
    nombre: 'Gestión de Proyectos Digitales',
    descripcion: 'Planifica y da seguimiento a proyectos tecnológicos con metodologías ágiles.',
    duracion: '3 meses',
    modalidad: 'hibrida',
    moodleCourseShortname: null,
  },
  {
    id: 'cert-ciberseguridad-soc',
    tipo: 'certificacion',
    nombre: 'Ciberseguridad Defensiva y SOC',
    descripcion: 'Capacítate en detección y respuesta a incidentes de seguridad informática.',
    duracion: '6 semanas',
    modalidad: 'en_linea',
    moodleCourseShortname: null,
  },
  {
    id: 'lic-ciencia-datos',
    tipo: 'licenciatura',
    nombre: 'Licenciatura en Ciencia de Datos',
    descripcion:
      'Domina estadística aplicada, machine learning y visualización de datos para la toma de decisiones.',
    duracion: '12 cuatrimestres',
    modalidad: 'en_linea',
    moodleCourseShortname: null,
  },
  {
    id: 'dip-ux-ui',
    tipo: 'diplomado',
    nombre: 'Diplomado en UX/UI y Diseño de Producto',
    descripcion: 'Investigación de usuarios, prototipado y sistemas de diseño para productos digitales.',
    duracion: '3 meses',
    modalidad: 'hibrida',
    moodleCourseShortname: null,
  },
  {
    id: 'cert-devops-cicd',
    tipo: 'certificacion',
    nombre: 'Certificación en DevOps y CI/CD',
    descripcion: 'Automatiza integración, pruebas y despliegue continuo con herramientas usadas en la industria.',
    duracion: '6 semanas',
    modalidad: 'en_linea',
    moodleCourseShortname: null,
  },
];

/**
 * Seriación real de materias, usando cursos de Moodle que ya existen (ver
 * infrastructure/moodle-seed-cursos.php y MOODLE_TEST_COURSE): sin esto, el panel
 * /admin/materias queda vacío y la seriación nunca se puede probar de punta a punta.
 * Solo lic-software-ia tiene una cadena de prerequisito; las demás carreras quedan con
 * una materia suelta (sin prerequisitos) para que el catálogo no esté vacío en ellas.
 */
const MATERIAS_SEMILLA: Materia[] = [
  {
    id: 'soft-induccion',
    programaId: 'lic-software-ia',
    nombre: 'Inducción a la Licenciatura',
    moodleCourseShortname: 'IINICIA101',
    prerequisitos: [],
  },
  {
    id: 'soft-fundamentos-ia',
    programaId: 'lic-software-ia',
    nombre: 'Fundamentos de Ingeniería de Software e IA',
    moodleCourseShortname: 'IINICIA-SOFT1',
    prerequisitos: ['soft-induccion'],
  },
  {
    id: 'ciber-fundamentos',
    programaId: 'cert-ciberseguridad-soc',
    nombre: 'Ciberseguridad Defensiva y SOC',
    moodleCourseShortname: 'IINICIA-CIBER1',
    prerequisitos: [],
  },
  {
    id: 'negocios-fundamentos',
    programaId: 'lic-admon-negocios',
    nombre: 'Administración de Negocios Digitales',
    moodleCourseShortname: 'IINICIA-NEG1',
    prerequisitos: [],
  },
  // IINICIA102/IINICIA103 ya existían en Moodle con contenido real (instalación base), pero
  // nunca se habían registrado como materias: sin esto, ese contenido quedaba sin usar y la
  // seriación de lic-software-ia se quedaba en solo 2 pasos.
  {
    id: 'soft-fundamentos-prog',
    programaId: 'lic-software-ia',
    nombre: 'Fundamentos de Programación',
    moodleCourseShortname: 'IINICIA102',
    prerequisitos: ['soft-induccion'],
  },
  {
    id: 'soft-calculo-diferencial',
    programaId: 'lic-software-ia',
    nombre: 'Cálculo Diferencial',
    moodleCourseShortname: 'IINICIA103',
    prerequisitos: ['soft-induccion'],
  },
  {
    id: 'cloud-fundamentos',
    programaId: 'dip-cloud-kubernetes',
    nombre: 'Cloud Architecture & Kubernetes: Fundamentos',
    moodleCourseShortname: 'IINICIA-CLOUD1',
    prerequisitos: [],
  },
  {
    id: 'pm-fundamentos',
    programaId: 'dip-gestion-proyectos',
    nombre: 'Gestión de Proyectos Digitales: Fundamentos',
    moodleCourseShortname: 'IINICIA-PM1',
    prerequisitos: [],
  },
  {
    id: 'datos-fundamentos',
    programaId: 'lic-ciencia-datos',
    nombre: 'Fundamentos de Ciencia de Datos',
    moodleCourseShortname: 'IINICIA-DATOS1',
    prerequisitos: [],
  },
  {
    id: 'ux-fundamentos',
    programaId: 'dip-ux-ui',
    nombre: 'UX/UI y Diseño de Producto: Fundamentos',
    moodleCourseShortname: 'IINICIA-UX1',
    prerequisitos: [],
  },
  {
    id: 'devops-fundamentos',
    programaId: 'cert-devops-cicd',
    nombre: 'DevOps y CI/CD: Fundamentos',
    moodleCourseShortname: 'IINICIA-DEVOPS1',
    prerequisitos: [],
  },
];

const BCRYPT_ROUNDS = 10;

/**
 * Cursos reales con contenido (páginas, tarea, cuestionario y foro — ver
 * infrastructure/moodle-seed-cursos.php) en los que se matricula a profesor.prueba como
 * editingteacher, para que su dashboard muestre cursos reales en vez de datos de ejemplo. Si
 * ese script todavía no corrió en esta máquina, el curso no existe en Moodle y se omite (warn),
 * sin tronar el resto del seed.
 */
const CURSOS_PROFESOR_PRUEBA = [
  'IINICIA-SOFT1',
  'IINICIA-CIBER1',
  'IINICIA-NEG1',
  'IINICIA-CLOUD1',
  'IINICIA-PM1',
  'IINICIA-DATOS1',
  'IINICIA-UX1',
  'IINICIA-DEVOPS1',
];

interface UsuarioSemilla {
  nombre: string;
  correo: string;
  /** Variable de entorno con la contraseña; si no está definida, se genera una aleatoria y se imprime en el log. */
  envPassword: string;
  rol: Rol;
  /** El estudiante de prueba se vincula/matricula como estudiante en su curso. */
  vincularMoodle?: boolean;
  /** El profesor de prueba se vincula y se matricula como editingteacher en estos cursos. */
  cursosProfesor?: string[];
}

/**
 * Cuentas de prueba, una por rol (aspirante ya se crea vía POST
 * /auth/registro). Permite iniciar sesión con cada rol y ver que el portal
 * lo reconoce (badge de rol en Mi IINICIA), sin depender de alta manual por
 * SQL. Documentadas también en infrastructure/README.md. Las contraseñas
 * salen de backend/.env (nunca se suben al repo); sin esas variables se
 * genera una aleatoria distinta en cada corrida y se imprime en el log.
 */
const USUARIOS_PRUEBA: UsuarioSemilla[] = [
  {
    nombre: 'Superadmin Prueba',
    correo: 'superadmin.prueba@iinicia.test',
    envPassword: 'SEED_PASSWORD_SUPERADMIN',
    rol: Rol.Superadmin,
  },
  {
    nombre: 'Admin Académico Prueba',
    correo: 'admin.prueba@iinicia.test',
    envPassword: 'SEED_PASSWORD_ADMIN_ACADEMICO',
    rol: Rol.AdminAcademico,
  },
  {
    nombre: 'Coordinador Prueba',
    correo: 'coordinador.prueba@iinicia.test',
    envPassword: 'SEED_PASSWORD_COORDINADOR',
    rol: Rol.Coordinador,
  },
  {
    nombre: 'Profesor Prueba',
    correo: 'profesor.prueba@iinicia.test',
    envPassword: 'SEED_PASSWORD_PROFESOR',
    rol: Rol.Profesor,
    cursosProfesor: CURSOS_PROFESOR_PRUEBA,
  },
  {
    nombre: 'Estudiante Prueba',
    correo: 'estudiante.prueba@iinicia.test',
    envPassword: 'SEED_PASSWORD_ESTUDIANTE',
    rol: Rol.Estudiante,
    vincularMoodle: true,
  },
];

/**
 * Vincula (si falta) la cuenta Moodle del profesor con su mismo correo del portal y lo
 * matricula como editingteacher en cada curso dado. A diferencia de `vincularYMatricularMoodle`
 * (que matricula como estudiante en un solo curso), nunca lanza por curso: si uno no existe
 * (p. ej. no se corrió infrastructure/moodle-seed-cursos.php todavía) solo lo advierte y sigue
 * con los demás.
 */
async function vincularProfesorComoEditingteacher(
  { users, moodle, config, logger }: { users: UsersService; moodle: MoodleService; config: ConfigService; logger: Logger },
  user: { id: string; correo: string; nombre: string },
  cursos: string[],
): Promise<void> {
  let moodleUserId: number;
  try {
    moodleUserId = await moodle.buscarOCrearUsuarioMoodle(user.correo, user.nombre);
    await users.actualizarMoodleUserId(user.id, moodleUserId);
  } catch (error) {
    logger.warn(`No se pudo vincular a Moodle al profesor ${user.id}: ${String(error)}`);
    return;
  }

  const teacherRoleId = config.get<string>('MOODLE_ROLEID_TEACHER', '3');
  for (const shortname of cursos) {
    try {
      await moodle.matricularEnCurso(moodleUserId, shortname, teacherRoleId);
      logger.log(`Profesor ${user.correo} matriculado como editingteacher en ${shortname}`);
    } catch (error) {
      logger.warn(
        `No se pudo matricular al profesor ${user.id} en ${shortname} (¿corriste moodle-seed-cursos.php?): ${String(error)}`,
      );
    }
  }
}

async function main(): Promise<void> {
  const logger = new Logger('Seed');
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'warn', 'error'],
  });

  try {
    const users = app.get(UsersService);
    const moodle = app.get(MoodleService);
    const config = app.get(ConfigService);
    const programas = app.get(ProgramasService);
    const materias = app.get(MateriasService);

    for (const data of PROGRAMAS_SEMILLA) {
      const existente = await programas.findById(data.id);
      if (!existente) {
        await programas.crear(data);
        logger.log(`Creado programa ${data.id}`);
      } else {
        await programas.actualizar(data.id, data);
        logger.log(`Actualizado programa ${data.id}`);
      }
    }

    for (const data of MATERIAS_SEMILLA) {
      const existente = await materias.findById(data.id);
      if (!existente) {
        await materias.crear(data);
        logger.log(`Creada materia ${data.id}`);
      } else {
        await materias.actualizar(data.id, data);
        logger.log(`Actualizada materia ${data.id}`);
      }
    }

    for (const data of USUARIOS_PRUEBA) {
      let password = config.get<string>(data.envPassword);
      if (!password) {
        password = randomBytes(9).toString('base64url');
        logger.warn(`${data.envPassword} no está definida; contraseña generada para ${data.correo}: ${password}`);
      }
      const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
      let user = await users.findByCorreo(data.correo);
      if (!user) {
        user = await users.create({
          nombre: data.nombre,
          correo: data.correo,
          passwordHash,
          rol: data.rol,
        });
        logger.log(`Creado ${data.correo} (${data.rol})`);
      } else {
        // Reafirma nombre, rol y contraseña conocidos en cada corrida, aunque
        // la cuenta ya existiera con otros datos (p.ej. un correo que alguien
        // autorregistró antes como aspirante): el seed siempre deja un estado
        // conocido y repetible para la demo.
        await users.actualizarNombre(user.id, data.nombre);
        await users.actualizarRol(user.id, data.rol);
        await users.actualizarPasswordHash(user.id, passwordHash);
        user.rol = data.rol;
        logger.log(`Actualizado ${data.correo} (${data.rol}) con credenciales conocidas`);
      }

      if (data.vincularMoodle && user.moodleUserId === null) {
        await vincularYMatricularMoodle({ users, moodle, config, logger }, user);
      }

      // Sin el guard de moodleUserId === null de arriba: buscarOCrearUsuarioMoodle y
      // matricularEnCurso son idempotentes, así que repetir esto en cada corrida del seed
      // nunca duplica nada y sirve para completar la matrícula de profesor.prueba aunque su
      // cuenta Moodle ya existiera vinculada sin estar matriculada en estos cursos todavía.
      if (data.cursosProfesor) {
        await vincularProfesorComoEditingteacher(
          { users, moodle, config, logger },
          user,
          data.cursosProfesor,
        );
      }
    }
  } finally {
    await app.close();
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
