import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AspiranteModule } from './aspirante/aspirante.module.js';
import { AuthModule } from './auth/auth.module.js';
import { Documento } from './documentos/documento.entity.js';
import { DocumentosModule } from './documentos/documentos.module.js';
import { EstudianteModule } from './estudiante/estudiante.module.js';
import { Materia } from './materias/materia.entity.js';
import { MateriasModule } from './materias/materias.module.js';
import { MoodleModule } from './moodle/moodle.module.js';
import { Programa } from './programas/programa.entity.js';
import { ProgramasModule } from './programas/programas.module.js';
import { User } from './users/user.entity.js';
import { UsersModule } from './users/users.module.js';
import { UsuariosModule } from './usuarios/usuarios.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // Límite global de peticiones por IP (ver docs/requerimientos.md Sec. 16,
    // "rate limiting"). Rutas sensibles como /auth/login usan un límite más
    // estricto con @Throttle (ver AuthController).
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 60 }]),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres' as const,
        url: config.getOrThrow<string>('DATABASE_URL'),
        entities: [User, Programa, Materia, Documento],
        // Solo para desarrollo de la primera entrega; usar migraciones en producción.
        synchronize: config.get<string>('DB_SYNCHRONIZE', 'true') === 'true',
      }),
    }),
    UsersModule,
    AuthModule,
    MoodleModule,
    EstudianteModule,
    UsuariosModule,
    ProgramasModule,
    MateriasModule,
    DocumentosModule,
    AspiranteModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
