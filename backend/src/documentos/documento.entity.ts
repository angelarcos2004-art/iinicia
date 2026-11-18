import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from 'typeorm';

export type TipoDocumento = 'identificacion' | 'comprobante_estudios' | 'otro';
export type EstadoDocumento = 'pendiente' | 'aprobado' | 'rechazado';

/** Documento subido por un aspirante como parte de su proceso de admisión (docs/requerimientos.md §12). */
@Entity({ name: 'documentos' })
export class Documento {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ type: 'varchar', length: 30 })
  tipo!: TipoDocumento;

  @Column({ name: 'nombre_original', type: 'varchar', length: 255 })
  nombreOriginal!: string;

  @Column({ name: 'mime_type', type: 'varchar', length: 100 })
  mimeType!: string;

  /** Ruta absoluta en disco (ver storage.ts); nunca se expone al cliente, solo el id. */
  @Column({ name: 'ruta_archivo', type: 'varchar', length: 500 })
  rutaArchivo!: string;

  @Column({ type: 'varchar', length: 20, default: 'pendiente' })
  estado!: EstadoDocumento;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
