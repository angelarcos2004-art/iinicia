import { BadRequestException, INestApplication, ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { AllExceptionsFilter } from './common/all-exceptions.filter.js';

/** Configuración compartida entre main.ts y las pruebas e2e. */
export function setupApp(app: INestApplication, allowedOrigin: string): void {
  // Cabeceras de seguridad HTTP base (docs/requerimientos.md Sec. 16): API
  // JSON pura, sin contentSecurityPolicy (es para HTML servido por el
  // propio backend, que aquí no aplica).
  app.use(helmet({ contentSecurityPolicy: false }));
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
