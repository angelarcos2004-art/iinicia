import { IsEmail, Matches } from 'class-validator';

export class Verificar2FADto {
  @IsEmail({}, { message: 'El correo no es válido' })
  correo!: string;

  @Matches(/^\d{6}$/, { message: 'El código debe tener 6 dígitos' })
  codigo!: string;
}
