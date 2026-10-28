import { IsIn, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import type { ModalidadPrograma, TipoPrograma } from '../programa.entity.js';

const TIPOS: TipoPrograma[] = ['licenciatura', 'diplomado', 'certificacion'];
const MODALIDADES: ModalidadPrograma[] = ['en_linea', 'hibrida'];

export class CrearProgramaDto {
  @IsString({ message: 'El id es obligatorio' })
  @IsNotEmpty({ message: 'El id es obligatorio' })
  @MaxLength(100)
  id!: string;

  @IsIn(TIPOS, { message: 'Tipo de programa inválido' })
  tipo!: TipoPrograma;

  @IsString({ message: 'El nombre es obligatorio' })
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  @MaxLength(200)
  nombre!: string;

  @IsString({ message: 'La descripción es obligatoria' })
  @IsNotEmpty({ message: 'La descripción es obligatoria' })
  descripcion!: string;

  @IsString({ message: 'La duración es obligatoria' })
  @IsNotEmpty({ message: 'La duración es obligatoria' })
  @MaxLength(50)
  duracion!: string;

  @IsIn(MODALIDADES, { message: 'Modalidad inválida' })
  modalidad!: ModalidadPrograma;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  moodleCourseShortname?: string | null;
}
