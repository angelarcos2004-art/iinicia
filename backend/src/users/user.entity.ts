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

  /**
   * Ámbito del coordinador (docs/requerimientos.md §11: "acceso limitado al
   * programa o unidad asignada"). Solo tiene efecto cuando rol = coordinador;
   * null = sin ámbito asignado todavía.
   */
  @Column({ name: 'programa_coordinado_id', type: 'varchar', length: 100, nullable: true })
  programaCoordinadoId!: string | null;

  @Column({ name: 'acepta_aviso_privacidad', type: 'boolean', default: false })
  aceptaAvisoPrivacidad!: boolean;

  @Column({ name: 'desea_informacion_becas', type: 'boolean', default: false })
  deseaInformacionBecas!: boolean;

  /** Token FCM del dispositivo Android actual del usuario (ver backend/src/push). */
  @Column({ name: 'fcm_token', type: 'varchar', length: 255, nullable: true })
  fcmToken!: string | null;

  /** Hash (bcrypt) del token de recuperación de contraseña vigente, si hay uno. */
  @Column({ name: 'reset_password_token_hash', type: 'varchar', length: 100, nullable: true })
  resetPasswordTokenHash!: string | null;

  @Column({ name: 'reset_password_expira', type: 'timestamp', nullable: true })
  resetPasswordExpira!: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
