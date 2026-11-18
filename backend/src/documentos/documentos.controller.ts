import { createReadStream } from 'node:fs';
import { Controller, Get, NotFoundException, Param, Patch, Body, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { Roles } from '../auth/roles.decorator.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { Rol } from '../users/rol.enum.js';
import { ActualizarEstadoDocumentoDto } from './dto/actualizar-estado-documento.dto.js';
import { DocumentosService, mapearDocumento, type DocumentoListado } from './documentos.service.js';

/**
 * Revisión administrativa de documentos de admisión subidos por aspirantes (ver
 * AspiranteController para la subida). Separado de UsuariosController para no mezclar
 * `:id` de usuario con `:id` de documento en la misma ruta.
 */
@Controller('documentos')
@UseGuards(JwtAuthGuard, RolesGuard)
export class DocumentosController {
  constructor(private readonly documentos: DocumentosService) {}

  @Get('usuario/:userId')
  @Roles(Rol.Superadmin, Rol.AdminAcademico, Rol.Coordinador)
  async listarDeUsuario(@Param('userId') userId: string): Promise<DocumentoListado[]> {
    const docs = await this.documentos.listarPorUsuario(userId);
    return docs.map(mapearDocumento);
  }

  @Patch(':id/estado')
  @Roles(Rol.Superadmin, Rol.AdminAcademico)
  async revisar(
    @Param('id') id: string,
    @Body() dto: ActualizarEstadoDocumentoDto,
  ): Promise<DocumentoListado> {
    const existente = await this.documentos.findById(id);
    if (!existente) {
      throw new NotFoundException('Documento no encontrado');
    }
    const actualizado = await this.documentos.actualizarEstado(id, dto.estado);
    return mapearDocumento(actualizado);
  }

  /** Streaming del archivo original, solo para roles de revisión (nunca se expone la ruta en disco). */
  @Get(':id/archivo')
  @Roles(Rol.Superadmin, Rol.AdminAcademico, Rol.Coordinador)
  async descargar(@Param('id') id: string, @Res() res: Response): Promise<void> {
    const doc = await this.documentos.findById(id);
    if (!doc) {
      throw new NotFoundException('Documento no encontrado');
    }
    res.setHeader('Content-Type', doc.mimeType);
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${encodeURIComponent(doc.nombreOriginal)}"`,
    );
    createReadStream(doc.rutaArchivo).pipe(res);
  }
}
