import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { EstadoRevisionDocumento } from './dto/actualizar-estado-documento.dto.js';
import { Documento, type TipoDocumento } from './documento.entity.js';

export interface CrearDocumentoData {
  userId: string;
  tipo: TipoDocumento;
  nombreOriginal: string;
  mimeType: string;
  rutaArchivo: string;
}

/** Fila expuesta a la API: nunca incluye `rutaArchivo` (ver DocumentosController :id/archivo). */
export interface DocumentoListado {
  id: string;
  tipo: TipoDocumento;
  nombreOriginal: string;
  estado: string;
  createdAt: Date;
}

export function mapearDocumento(doc: Documento): DocumentoListado {
  return {
    id: doc.id,
    tipo: doc.tipo,
    nombreOriginal: doc.nombreOriginal,
    estado: doc.estado,
    createdAt: doc.createdAt,
  };
}

@Injectable()
export class DocumentosService {
  constructor(@InjectRepository(Documento) private readonly repo: Repository<Documento>) {}

  crear(data: CrearDocumentoData): Promise<Documento> {
    return this.repo.save(this.repo.create({ ...data, estado: 'pendiente' }));
  }

  listarPorUsuario(userId: string): Promise<Documento[]> {
    return this.repo.find({ where: { userId }, order: { createdAt: 'DESC' } });
  }

  findById(id: string): Promise<Documento | null> {
    return this.repo.findOne({ where: { id } });
  }

  async actualizarEstado(id: string, estado: EstadoRevisionDocumento): Promise<Documento> {
    await this.repo.update(id, { estado });
    const doc = await this.findById(id);
    if (!doc) {
      throw new NotFoundException('Documento no encontrado');
    }
    return doc;
  }
}
