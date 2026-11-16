import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import type { Response } from 'express';

/** Devuelve siempre `{ "message": string }`, que es lo que lee el portal. */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<Response>();

    if (exception instanceof ThrottlerException) {
      res
        .status(exception.getStatus())
        .json({ message: 'Demasiados intentos. Espera un minuto e intenta de nuevo.' });
      return;
    }

    if (exception instanceof HttpException) {
      res.status(exception.getStatus()).json({ message: this.extract(exception) });
      return;
    }

    this.logger.error(exception instanceof Error ? exception.stack : String(exception));
    res
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json({ message: 'Error interno del servidor' });
  }

  private extract(exception: HttpException): string {
    const body = exception.getResponse();
    if (typeof body === 'string') return body;
    const message = (body as { message?: string | string[] }).message;
    if (Array.isArray(message)) return message[0] ?? exception.message;
    return message ?? exception.message;
  }
}
