import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { MateriasModule } from '../materias/materias.module.js';
import { MoodleModule } from '../moodle/moodle.module.js';
import { ProgramasModule } from '../programas/programas.module.js';
import { PushModule } from '../push/push.module.js';
import { UsersModule } from '../users/users.module.js';
import { UsuariosController } from './usuarios.controller.js';

@Module({
  imports: [UsersModule, MoodleModule, AuthModule, PushModule, ProgramasModule, MateriasModule],
  controllers: [UsuariosController],
})
export class UsuariosModule {}
