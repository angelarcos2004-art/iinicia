import { IsIn } from 'class-validator';

export const ESTADOS_REVISION_DOCUMENTO = ['aprobado', 'rechazado'] as const;
export type EstadoRevisionDocumento = (typeof ESTADOS_REVISION_DOCUMENTO)[number];

export class ActualizarEstadoDocumentoDto {
  @IsIn(ESTADOS_REVISION_DOCUMENTO, { message: 'Estado inválido' })
  estado!: EstadoRevisionDocumento;
}
