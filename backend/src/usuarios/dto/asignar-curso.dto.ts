import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class AsignarCursoDto {
  @IsString({ message: 'El curso es obligatorio' })
  @IsNotEmpty({ message: 'El curso es obligatorio' })
  @MaxLength(100)
  cursoShortname!: string;
}
