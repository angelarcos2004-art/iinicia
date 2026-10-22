import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Rol } from './rol.enum.js';

@Entity({ name: 'users' })
export class User {
  /** Identificador interno estable (UUID). Nunca se reutiliza el correo como id técnico. */
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 200 })
  nombre!: string;

  @Column({ type: 'varchar', length: 254, unique: true })
  correo!: string;

  @Column({ name: 'password_hash', type: 'varchar', length: 100 })
  passwordHash!: string;

  @Column({ type: 'varchar', length: 30, default: Rol.Aspirante })
  rol!: Rol;

  /**
   * Relación persistente con la cuenta Moodle (integración idempotente).
   * Nullable hasta que la fase de integración cree/vincule el usuario en Moodle.
   */
  @Column({ name: 'moodle_user_id', type: 'int', nullable: true, unique: true })
  moodleUserId!: number | null;

  /** Programa de interés elegido en el registro (id del catálogo del portal). */
  @Column({ name: 'programa_interes_id', type: 'varchar', length: 100, nullable: true })
  programaInteresId!: string | null;

  @Column({ name: 'acepta_aviso_privacidad', type: 'boolean', default: false })
  aceptaAvisoPrivacidad!: boolean;

  @Column({ name: 'desea_informacion_becas', type: 'boolean', default: false })
  deseaInformacionBecas!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
