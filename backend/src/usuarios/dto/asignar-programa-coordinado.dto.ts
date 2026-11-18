import { IsOptional, IsString, MaxLength } from 'class-validator';

/** null quita el ámbito del coordinador (vuelve a ver todo, como hoy). */
export class AsignarProgramaCoordinadoDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  programaId!: string | null;
}
