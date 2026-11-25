import { BadRequestException, INestApplication, ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { AllExceptionsFilter } from './common/all-exceptions.filter.js';

/** Configuración compartida entre main.ts y las pruebas e2e. */
export function setupApp(app: INestApplication, allowedOrigin: string | string[]): void {
  // Cabeceras de seguridad HTTP base (docs/requerimientos.md Sec. 16). API JSON
  // pura salvo GET /documentos/:id/archivo, que sirve el PDF/JPG/PNG subido con
  // Content-Disposition: inline (documentos.controller.ts) — CSP restrictiva por
  // defecto para que ese archivo nunca pueda ejecutar nada en el origen del backend.
  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: false,
        directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"], objectSrc: ["'none'"] },
      },
    }),
  );
  app.enableCors({ origin: allowedOrigin });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      // Los errores de validación deben ser 400 con { message: string }
      exceptionFactory: (errors) =>
        new BadRequestException(
          Object.values(errors[0]?.constraints ?? {})[0] ?? 'Datos inválidos',
        ),
    }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());
}
