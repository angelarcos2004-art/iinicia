import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import bcrypt from 'bcryptjs';
import { AppModule } from './app.module.js';
import { vincularYMatricularMoodle } from './moodle/moodle-onboarding.js';
import { MoodleService } from './moodle/moodle.service.js';
import { Rol } from './users/rol.enum.js';
import { UsersService } from './users/users.service.js';

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
