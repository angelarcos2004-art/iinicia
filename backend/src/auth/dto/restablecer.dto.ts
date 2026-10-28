import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class RestablecerDto {
  @IsEmail({}, { message: 'El correo no es válido' })
  @MaxLength(254)
  correo!: string;

  @IsString({ message: 'El token de recuperación es obligatorio' })
  token!: string;

  @IsString({ message: 'La contraseña es obligatoria' })
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @MaxLength(72, { message: 'La contraseña no puede exceder 72 caracteres' })
  nuevaPassword!: string;
}
