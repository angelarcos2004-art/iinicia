import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { BadRequestException } from '@nestjs/common';
import type { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface.js';
import { diskStorage } from 'multer';

/** Mimetype -> extensión de archivo que se guarda en disco. */
const EXTENSIONES_PERMITIDAS: Record<string, string> = {
  'application/pdf': '.pdf',
  'image/jpeg': '.jpg',
  'image/png': '.png',
};

export const DOCUMENTOS_DIR = join(process.env.UPLOADS_DIR ?? './uploads', 'documentos');

const TAMANO_MAXIMO_BYTES = 5 * 1024 * 1024;

/** Opciones de Multer para `FileInterceptor('archivo', ...)`: valida tipo y tamaño antes de guardar. */
export function multerOptionsDocumentos(): MulterOptions {
  if (!existsSync(DOCUMENTOS_DIR)) {
    mkdirSync(DOCUMENTOS_DIR, { recursive: true });
  }
  return {
    storage: diskStorage({
      destination: DOCUMENTOS_DIR,
      filename: (_req, file, cb) => {
        cb(null, `${randomUUID()}${EXTENSIONES_PERMITIDAS[file.mimetype] ?? ''}`);
      },
    }),
    limits: { fileSize: TAMANO_MAXIMO_BYTES },
    fileFilter: (_req, file, cb) => {
      if (!EXTENSIONES_PERMITIDAS[file.mimetype]) {
        cb(new BadRequestException('Solo se aceptan archivos PDF, JPG o PNG (máx. 5 MB).'), false);
        return;
      }
      cb(null, true);
    },
  };
}
