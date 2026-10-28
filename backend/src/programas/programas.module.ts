import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { Programa } from './programa.entity.js';
import { ProgramasController } from './programas.controller.js';
import { ProgramasService } from './programas.service.js';

/**
 * JwtAuthGuard/RolesGuard se proveen aquí localmente (no se importa AuthModule): ninguno de
 * los dos necesita nada propio de AuthModule (la estrategia 'jwt' de passport ya queda
 * registrada globalmente una sola vez, vía AuthModule en AppModule) y así se evita que
 * AuthModule y ProgramasModule se importen uno al otro en círculo (AuthService sí depende de
 * ProgramasService para resolver el curso de Moodle del programa del usuario).
 */
@Module({
  imports: [TypeOrmModule.forFeature([Programa])],
  controllers: [ProgramasController],
  providers: [ProgramasService, JwtAuthGuard, RolesGuard],
  exports: [ProgramasService],
})
export class ProgramasModule {}
