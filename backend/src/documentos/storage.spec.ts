import { BadRequestException } from '@nestjs/common';
import { multerOptionsDocumentos } from './storage.js';

describe('multerOptionsDocumentos', () => {
  const opciones = multerOptionsDocumentos();

  function filtrar(mimetype: string): Promise<[Error | null, boolean]> {
    return new Promise((resolve) => {
      opciones.fileFilter!({} as never, { mimetype } as never, (err, acceptFile) =>
        resolve([err as Error | null, acceptFile ?? false]),
      );
    });
  }

  it('acepta PDF, JPG y PNG', async () => {
    for (const mimetype of ['application/pdf', 'image/jpeg', 'image/png']) {
      const [err, aceptado] = await filtrar(mimetype);
      expect(err).toBeNull();
      expect(aceptado).toBe(true);
    }
  });

  it('rechaza cualquier otro tipo de archivo (ej. ejecutables o scripts disfrazados)', async () => {
    const [err, aceptado] = await filtrar('application/x-msdownload');
    expect(err).toBeInstanceOf(BadRequestException);
    expect(aceptado).toBe(false);
  });

  it('limita el tamaño del archivo a 5 MB', () => {
    expect(opciones.limits?.fileSize).toBe(5 * 1024 * 1024);
  });
});
