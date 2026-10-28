import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class NotificarDto {
  @IsString({ message: 'El título es obligatorio' })
  @IsNotEmpty({ message: 'El título es obligatorio' })
  @MaxLength(100)
  titulo!: string;

  @IsString({ message: 'El mensaje es obligatorio' })
  @IsNotEmpty({ message: 'El mensaje es obligatorio' })
  @MaxLength(500)
  mensaje!: string;
}
