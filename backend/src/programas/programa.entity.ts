import { Column, Entity, PrimaryColumn } from 'typeorm';

export type TipoPrograma = 'licenciatura' | 'diplomado' | 'certificacion';
export type ModalidadPrograma = 'en_linea' | 'hibrida';

/**
 * Catálogo de oferta académica (docs/requerimientos.md Sec. 12: "la persona completa su
 * perfil y selecciona programa"). `id` es un slug legible (no UUID) porque ya se usa como
 * valor libre en `User.programaInteresId` desde el registro de aspirantes.
 */
@Entity({ name: 'programas' })
export class Programa {
  @PrimaryColumn({ type: 'varchar', length: 100 })
  id!: string;

  @Column({ type: 'varchar', length: 30 })
  tipo!: TipoPrograma;

  @Column({ type: 'varchar', length: 200 })
  nombre!: string;

  @Column({ type: 'text' })
  descripcion!: string;

  @Column({ type: 'varchar', length: 50 })
  duracion!: string;

  @Column({ type: 'varchar', length: 20 })
  modalidad!: ModalidadPrograma;

  /**
   * Curso de Moodle (shortname) al que se matricula a un aspirante admitido en este programa
   * (ver moodle-onboarding.ts). Null = todavía no tiene curso real asignado; se usa
   * MOODLE_TEST_COURSE como respaldo.
   */
  @Column({ name: 'moodle_course_shortname', type: 'varchar', length: 100, nullable: true })
  moodleCourseShortname!: string | null;
}
