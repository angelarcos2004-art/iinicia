import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { ActualizarProgramaDto } from './dto/actualizar-programa.dto.js';
import type { CrearProgramaDto } from './dto/crear-programa.dto.js';
import { Programa } from './programa.entity.js';

@Injectable()
export class ProgramasService {
  constructor(@InjectRepository(Programa) private readonly repo: Repository<Programa>) {}

  listar(): Promise<Programa[]> {
    return this.repo.find({ order: { nombre: 'ASC' } });
  }

  findById(id: string): Promise<Programa | null> {
    return this.repo.findOne({ where: { id } });
  }

  async crear(dto: CrearProgramaDto): Promise<Programa> {
    if (await this.findById(dto.id)) {
      throw new BadRequestException('Ya existe un programa con ese id');
    }
    const programa = this.repo.create({ ...dto, moodleCourseShortname: dto.moodleCourseShortname ?? null });
    return this.repo.save(programa);
  }

  async actualizar(id: string, dto: ActualizarProgramaDto): Promise<Programa> {
    const programa = await this.findById(id);
    if (!programa) {
      throw new NotFoundException('Programa no encontrado');
    }
    Object.assign(programa, dto);
    return this.repo.save(programa);
  }

  /**
   * Curso de Moodle (shortname) del programa de interés del usuario, o null si no hay
   * programa, no existe, o no tiene uno asignado todavía (ver moodle-onboarding.ts: en ese
   * caso se usa MOODLE_TEST_COURSE como respaldo).
   */
  async obtenerMoodleCourseShortname(programaId: string | null): Promise<string | null> {
    if (!programaId) return null;
    const programa = await this.findById(programaId);
    return programa?.moodleCourseShortname ?? null;
  }
}
