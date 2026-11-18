import { IsIn } from 'class-validator';
import type { TipoDocumento } from '../documento.entity.js';

export const TIPOS_DOCUMENTO: TipoDocumento[] = ['identificacion', 'comprobante_estudios', 'otro'];

export class SubirDocumentoDto {
  @IsIn(TIPOS_DOCUMENTO, { message: 'Tipo de documento inválido' })
  tipo!: TipoDocumento;
}
