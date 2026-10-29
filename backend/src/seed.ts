import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import bcrypt from 'bcryptjs';
import { AppModule } from './app.module.js';
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

const BCRYPT_ROUNDS = 10;

interface UsuarioSemilla {
  nombre: string;
  correo: string;
  password: string;
  rol: Rol;
  /** Solo el estudiante de prueba se vincula/matricula en Moodle: los demás
   * roles todavía no tienen pantallas propias en esta entrega (ver plan). */
  vincularMoodle?: boolean;
}

/**
 * Cuentas de prueba, una por rol (aspirante ya se crea vía POST
 * /auth/registro). Permite iniciar sesión con cada rol y ver que el portal
 * lo reconoce (badge de rol en Mi IINICIA), sin depender de alta manual por
 * SQL. Documentadas también en infrastructure/README.md.
 */
const USUARIOS_PRUEBA: UsuarioSemilla[] = [
  {
    nombre: 'Superadmin Prueba',
    correo: 'superadmin.prueba@iinicia.test',
    password: 'Superadmin#2026',
    rol: Rol.Superadmin,
  },
  {
    nombre: 'Admin Académico Prueba',
    correo: 'admin.prueba@iinicia.test',
    password: 'AdminAcademico#2026',
    rol: Rol.AdminAcademico,
  },
  {
    nombre: 'Coordinador Prueba',
    correo: 'coordinador.prueba@iinicia.test',
    password: 'Coordinador#2026',
    rol: Rol.Coordinador,
  },
  {
    nombre: 'Profesor Prueba',
    correo: 'profesor.prueba@iinicia.test',
    password: 'Profesor#2026',
    rol: Rol.Profesor,
  },
  {
    nombre: 'Estudiante Prueba',
    correo: 'estudiante.prueba@iinicia.test',
    password: 'Estudiante#2026',
    rol: Rol.Estudiante,
    vincularMoodle: true,
  },
];

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

    for (const data of USUARIOS_PRUEBA) {
      const passwordHash = await bcrypt.hash(data.password, BCRYPT_ROUNDS);
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
        // Reafirma rol y contraseña conocida en cada corrida, aunque la
        // cuenta ya existiera con otro rol/contraseña (p.ej. un correo que
        // alguien autorregistró antes como aspirante): el seed siempre deja
        // un estado conocido y repetible para la demo.
        await users.actualizarRol(user.id, data.rol);
        await users.actualizarPasswordHash(user.id, passwordHash);
        user.rol = data.rol;
        logger.log(`Actualizado ${data.correo} (${data.rol}) con credenciales conocidas`);
      }

      if (data.vincularMoodle && user.moodleUserId === null) {
        await vincularYMatricularMoodle({ users, moodle, config, logger }, user);
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
