import { BadRequestException, INestApplication, ValidationPipe } from '@nestjs/common';
import { AllExceptionsFilter } from './common/all-exceptions.filter.js';

/** Configuración compartida entre main.ts y las pruebas e2e. */
export function setupApp(app: INestApplication, allowedOrigin: string): void {
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
