import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { MoodleModule } from '../moodle/moodle.module.js';
import { UsersModule } from '../users/users.module.js';
import { EstudianteController } from './estudiante.controller.js';

@Module({
  imports: [UsersModule, MoodleModule, AuthModule],
  controllers: [EstudianteController],
})
export class EstudianteModule {}
