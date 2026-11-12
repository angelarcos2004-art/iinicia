import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { MoodleService } from '../moodle/moodle.service.js';
import type { User } from '../users/user.entity.js';
import type { ActualizarMateriaDto } from './dto/actualizar-materia.dto.js';
import type { CrearMateriaDto } from './dto/crear-materia.dto.js';
import { Materia } from './materia.entity.js';

@Injectable()
export class MateriasService {
  constructor(
    @InjectRepository(Materia) private readonly repo: Repository<Materia>,
    private readonly moodle: MoodleService,
  ) {}

  listar(programaId?: string): Promise<Materia[]> {
    return this.repo.find({ where: programaId ? { programaId } : {}, order: { nombre: 'ASC' } });
  }

  findById(id: string): Promise<Materia | null> {
    return this.repo.findOne({ where: { id } });
  }

  async crear(dto: CrearMateriaDto): Promise<Materia> {
    if (await this.findById(dto.id)) {
      throw new BadRequestException('Ya existe una materia con ese id');
    }
    const prerequisitos = dto.prerequisitos ?? [];
    await this.validarPrerequisitos(dto.id, dto.programaId, prerequisitos);
    const materia = this.repo.create({ ...dto, prerequisitos });
    return this.repo.save(materia);
  }

  async actualizar(id: string, dto: ActualizarMateriaDto): Promise<Materia> {
    const materia = await this.findById(id);
    if (!materia) {
      throw new NotFoundException('Materia no encontrada');
    }
    if (dto.prerequisitos) {
      await this.validarPrerequisitos(id, materia.programaId, dto.prerequisitos);
    }
    Object.assign(materia, dto);
    return this.repo.save(materia);
  }

  /**
   * Borra la materia, a menos que otra materia de la misma carrera la tenga como
   * prerequisito (si se borrara igual, esa materia quedaría con un prerequisito fantasma que
   * `verificarPrerequisitos` simplemente ignoraría, dejando pasar a cualquiera sin haberlo
   * aprobado nunca).
   */
  async eliminar(id: string): Promise<void> {
    const materia = await this.findById(id);
    if (!materia) {
      throw new NotFoundException('Materia no encontrada');
    }
    const delPrograma = await this.repo.find({ where: { programaId: materia.programaId } });
    const dependientes = delPrograma.filter((m) => m.prerequisitos.includes(id));
    if (dependientes.length > 0) {
      throw new BadRequestException(
        `No puedes borrar "${materia.nombre}": es prerequisito de ${dependientes
          .map((d) => d.nombre)
          .join(', ')}`,
      );
    }
    await this.repo.delete(id);
  }

  /** Una materia no puede ser su propio prerequisito, y cada prerequisito debe existir en la misma carrera. */
  private async validarPrerequisitos(
    id: string,
    programaId: string,
    prerequisitos: string[],
  ): Promise<void> {
    if (prerequisitos.includes(id)) {
      throw new BadRequestException('Una materia no puede ser prerequisito de sí misma');
    }
    if (prerequisitos.length === 0) return;
    const existentes = await this.repo.find({ where: { id: In(prerequisitos), programaId } });
    if (existentes.length !== new Set(prerequisitos).size) {
      throw new BadRequestException('Algún prerequisito no existe en esta carrera');
    }
  }

  /**
   * Si `programaId` (el programa de interés del usuario) tiene registrada una materia para
   * `courseShortname`, bloquea la matrícula mientras falte aprobar alguno de sus
   * prerequisitos. No es un curso de esa carrera (o el usuario eligió un curso suelto sin
   * programa) -> no hay fila de materia que coincida, y no se bloquea nada: comportamiento
   * actual sin cambios.
   */
  async verificarPrerequisitos(user: User, courseShortname: string): Promise<void> {
    if (!user.programaInteresId) return;

    const materia = await this.repo.findOne({
      where: { programaId: user.programaInteresId, moodleCourseShortname: courseShortname },
    });
    if (!materia || materia.prerequisitos.length === 0) return;

    const prerequisitos = await this.repo.find({ where: { id: In(materia.prerequisitos) } });
    const aprobadas = user.moodleUserId
      ? await this.moodle.obtenerCursosAprobados(user.moodleUserId)
      : new Set<string>();

    const faltantes = prerequisitos.filter((p) => !aprobadas.has(p.moodleCourseShortname));
    if (faltantes.length > 0) {
      throw new BadRequestException(
        `No puedes matricularte en "${materia.nombre}": falta aprobar ${faltantes
          .map((f) => f.nombre)
          .join(', ')}`,
      );
    }
  }
}
