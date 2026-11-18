import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import type { UsuarioAutenticado } from '../auth/jwt.strategy.js';
import { Roles } from '../auth/roles.decorator.js';
import { RolesGuard } from '../auth/roles.guard.js';
import { UsuarioActual } from '../auth/usuario-actual.decorator.js';
import { DocumentosService, mapearDocumento, type DocumentoListado } from '../documentos/documentos.service.js';
import { multerOptionsDocumentos } from '../documentos/storage.js';
import { ProgramasService } from '../programas/programas.service.js';
import { Rol } from '../users/rol.enum.js';
import { UsersService } from '../users/users.service.js';
import { SubirDocumentoDto } from '../documentos/dto/subir-documento.dto.js';

export interface SolicitudAspirante {
  programaNombre: string;
  estado: 'en_revision' | 'admitido';
  pasos: { label: string; completado: boolean }[];
}

/**
 * Autoservicio del aspirante durante su proceso de admisión (docs/requerimientos.md §12): ver el
 * estado real de su solicitud y subir los documentos que el comité revisará. La autorización
 * final (cambio de rol a estudiante) sigue siendo manual, vía UsuariosController.actualizarRol.
 */
@Controller('aspirante')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Rol.Aspirante)
export class AspiranteController {
  constructor(
    private readonly users: UsersService,
    private readonly programas: ProgramasService,
    private readonly documentos: DocumentosService,
  ) {}

  @Get('solicitud')
  async solicitud(@UsuarioActual() actual: UsuarioAutenticado): Promise<SolicitudAspirante> {
    const user = await this.users.findById(actual.id);
    const docs = await this.documentos.listarPorUsuario(actual.id);
    const programa = user?.programaInteresId
      ? await this.programas.findById(user.programaInteresId)
      : null;
    const perfilCompleto = !!user?.programaInteresId;
    const documentosCargados = docs.length > 0;
    // El guard de este controlador exige rol aspirante, así que "admitido" nunca es true aquí
    // hoy; se deja la condición real para cuando el frontend recargue tras la promoción.
    const admitido = user?.rol === Rol.Estudiante;

    return {
      programaNombre: programa?.nombre ?? 'Sin programa seleccionado',
      estado: admitido ? 'admitido' : 'en_revision',
      pasos: [
        { label: 'Cuenta creada', completado: true },
        { label: 'Perfil y programa seleccionados', completado: perfilCompleto },
        { label: 'Documentos cargados', completado: documentosCargados },
        { label: 'Dictamen del comité', completado: admitido },
      ],
    };
  }

  @Get('documentos')
  async misDocumentos(@UsuarioActual() actual: UsuarioAutenticado): Promise<DocumentoListado[]> {
    const docs = await this.documentos.listarPorUsuario(actual.id);
    return docs.map(mapearDocumento);
  }

  @Post('documentos')
  @UseInterceptors(FileInterceptor('archivo', multerOptionsDocumentos()))
  async subirDocumento(
    @UsuarioActual() actual: UsuarioAutenticado,
    @Body() dto: SubirDocumentoDto,
    @UploadedFile() archivo?: Express.Multer.File,
  ): Promise<DocumentoListado> {
    if (!archivo) {
      throw new BadRequestException('Selecciona un archivo (PDF, JPG o PNG, máx. 5 MB).');
    }
    const doc = await this.documentos.crear({
      userId: actual.id,
      tipo: dto.tipo,
      nombreOriginal: archivo.originalname,
      mimeType: archivo.mimetype,
      rutaArchivo: archivo.path,
    });
    return mapearDocumento(doc);
  }
}
