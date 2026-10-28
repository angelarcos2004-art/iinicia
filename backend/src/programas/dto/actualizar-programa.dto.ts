import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import type { ModalidadPrograma, TipoPrograma } from '../programa.entity.js';

const TIPOS: TipoPrograma[] = ['licenciatura', 'diplomado', 'certificacion'];
const MODALIDADES: ModalidadPrograma[] = ['en_linea', 'hibrida'];

/** Igual que CrearProgramaDto pero todo opcional (no se permite cambiar el id). */
export class ActualizarProgramaDto {
  @IsOptional()
  @IsIn(TIPOS, { message: 'Tipo de programa inválido' })
  tipo?: TipoPrograma;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  nombre?: string;

  @IsOptional()
  @IsString()
  descripcion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  duracion?: string;

  @IsOptional()
  @IsIn(MODALIDADES, { message: 'Modalidad inválida' })
  modalidad?: ModalidadPrograma;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  moodleCourseShortname?: string | null;
}
