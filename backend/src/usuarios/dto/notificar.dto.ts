import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class NotificarDto {
  @IsString({ message: 'El título es obligatorio' })
  @IsNotEmpty({ message: 'El título es obligatorio' })
  @MaxLength(100)
  titulo!: string;

  @IsString({ message: 'El mensaje es obligatorio' })
  @IsNotEmpty({ message: 'El mensaje es obligatorio' })
  @MaxLength(500)
  mensaje!: string;

  /**
   * Id de Moodle del curso al que se refiere el aviso (opcional). Si se da, la app Android
   * abre directo el detalle de ese curso al tocar la notificación, en vez de solo el dashboard
   * (requerimientos 9.1: "deep links hacia contenidos o actividades específicas").
   */
  @IsOptional()
  @IsString()
  @MaxLength(50)
  cursoId?: string;
}
