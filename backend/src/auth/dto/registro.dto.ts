import {
  Equals,
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegistroDto {
  @IsString({ message: 'El nombre completo es obligatorio' })
  @IsNotEmpty({ message: 'El nombre completo es obligatorio' })
  @MaxLength(200, { message: 'El nombre completo es demasiado largo' })
  nombreCompleto!: string;

  @IsEmail({}, { message: 'El correo no es válido' })
  @MaxLength(254)
  correo!: string;

  @IsString({ message: 'La contraseña es obligatoria' })
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  @MaxLength(72, { message: 'La contraseña no puede exceder 72 caracteres' })
  password!: string;

  @IsString({ message: 'Selecciona un programa de interés' })
  @IsNotEmpty({ message: 'Selecciona un programa de interés' })
  @MaxLength(100)
  programaInteresId!: string;

  @IsBoolean()
  @Equals(true, { message: 'Debes aceptar el aviso de privacidad' })
  aceptaAvisoPrivacidad!: boolean;

  @IsBoolean({ message: 'deseaInformacionBecas debe ser booleano' })
  deseaInformacionBecas!: boolean;
}
