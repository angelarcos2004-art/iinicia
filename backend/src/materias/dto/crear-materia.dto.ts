import { IsArray, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CrearMateriaDto {
  @IsString({ message: 'El id es obligatorio' })
  @IsNotEmpty({ message: 'El id es obligatorio' })
  @MaxLength(100)
  id!: string;

  @IsString({ message: 'El programa es obligatorio' })
  @IsNotEmpty({ message: 'El programa es obligatorio' })
  @MaxLength(100)
  programaId!: string;

  @IsString({ message: 'El nombre es obligatorio' })
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  @MaxLength(200)
  nombre!: string;

  @IsString({ message: 'El curso de Moodle es obligatorio' })
  @IsNotEmpty({ message: 'El curso de Moodle es obligatorio' })
  @MaxLength(100)
  moodleCourseShortname!: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  prerequisitos?: string[];
}
