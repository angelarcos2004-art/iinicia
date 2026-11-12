import { IsNotEmpty, IsString } from 'class-validator';

export class GoogleLoginDto {
  @IsString({ message: 'El idToken es obligatorio' })
  @IsNotEmpty({ message: 'El idToken es obligatorio' })
  idToken!: string;
}
