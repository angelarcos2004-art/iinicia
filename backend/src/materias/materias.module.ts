import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MoodleModule } from '../moodle/moodle.module.js';
import { Materia } from './materia.entity.js';
import { MateriasController } from './materias.controller.js';
import { MateriasService } from './materias.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Materia]), MoodleModule],
  controllers: [MateriasController],
  providers: [MateriasService],
  exports: [MateriasService],
})
export class MateriasModule {}
