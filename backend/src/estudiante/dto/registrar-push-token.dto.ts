import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class RegistrarPushTokenDto {
  @IsString({ message: 'El token es obligatorio' })
  @IsNotEmpty({ message: 'El token es obligatorio' })
  @MaxLength(255)
  token!: string;
}
