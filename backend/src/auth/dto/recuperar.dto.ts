import { IsEmail, MaxLength } from 'class-validator';

export class RecuperarDto {
  @IsEmail({}, { message: 'El correo no es válido' })
  @MaxLength(254)
  correo!: string;
}
