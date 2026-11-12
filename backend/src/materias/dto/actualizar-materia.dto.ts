import { IsArray, IsOptional, IsString, MaxLength } from 'class-validator';

/** Igual que CrearMateriaDto pero todo opcional (no se permite cambiar el id ni el programa). */
export class ActualizarMateriaDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  nombre?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  moodleCourseShortname?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  prerequisitos?: string[];
}
