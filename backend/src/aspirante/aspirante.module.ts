import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { DocumentosModule } from '../documentos/documentos.module.js';
import { ProgramasModule } from '../programas/programas.module.js';
import { UsersModule } from '../users/users.module.js';
import { AspiranteController } from './aspirante.controller.js';

@Module({
  imports: [UsersModule, ProgramasModule, DocumentosModule, AuthModule],
  controllers: [AspiranteController],
})
export class AspiranteModule {}
