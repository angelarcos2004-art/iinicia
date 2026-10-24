import { IsEnum } from 'class-validator';
import { Rol } from '../../users/rol.enum.js';

export class ActualizarRolDto {
  @IsEnum(Rol, { message: 'Rol inválido' })
  rol!: Rol;
}
