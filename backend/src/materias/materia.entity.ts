import { Column, Entity, PrimaryColumn } from 'typeorm';

/**
 * Materia (un curso de Moodle) dentro de una carrera, con prerequisitos opcionales (ver
 * MateriasService.verificarPrerequisitos). Solo bloquea avance cuando el alumno eligió una
 * carrera con materias registradas aquí; matricular en un curso suelto (sin fila de materia
 * para ese programa) sigue el comportamiento de siempre, sin seriación.
 */
@Entity({ name: 'materias' })
export class Materia {
  @PrimaryColumn({ type: 'varchar', length: 100 })
  id!: string;

  @Column({ name: 'programa_id', type: 'varchar', length: 100 })
  programaId!: string;

  @Column({ type: 'varchar', length: 200 })
  nombre!: string;

  @Column({ name: 'moodle_course_shortname', type: 'varchar', length: 100 })
  moodleCourseShortname!: string;

  /** Ids de materias (de la misma carrera) que hay que aprobar antes de matricularse aquí. */
  @Column({ type: 'simple-array', default: '' })
  prerequisitos!: string[];
}
