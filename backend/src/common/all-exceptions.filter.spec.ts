import { BadRequestException, type ArgumentsHost } from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import { AllExceptionsFilter } from './all-exceptions.filter.js';

function makeHost() {
  const json = vi.fn();
  const status = vi.fn().mockReturnValue({ json });
  const host = {
    switchToHttp: () => ({ getResponse: () => ({ status }) }),
  } as unknown as ArgumentsHost;
  return { host, status, json };
}

describe('AllExceptionsFilter', () => {
  it('ThrottlerException -> responde con el mensaje fijo de "demasiados intentos"', () => {
    const filter = new AllExceptionsFilter();
    const { host, status, json } = makeHost();

    filter.catch(new ThrottlerException(), host);

    expect(status).toHaveBeenCalledWith(429);
    expect(json).toHaveBeenCalledWith({ message: 'Demasiados intentos. Espera un minuto e intenta de nuevo.' });
  });

  it('HttpException con mensaje string -> lo reenvía tal cual', () => {
    const filter = new AllExceptionsFilter();
    const { host, status, json } = makeHost();

    filter.catch(new BadRequestException('Correo inválido'), host);

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({ message: 'Correo inválido' });
  });

  it('HttpException con mensajes de class-validator (array) -> usa el primero', () => {
    const filter = new AllExceptionsFilter();
    const { host, status, json } = makeHost();

    filter.catch(new BadRequestException(['El correo es obligatorio', 'La contraseña es obligatoria']), host);

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({ message: 'El correo es obligatorio' });
  });

  it('un error inesperado (no HttpException) -> 500 genérico, sin filtrar detalles internos', () => {
    const filter = new AllExceptionsFilter();
    const { host, status, json } = makeHost();

    filter.catch(new Error('falla interna con detalles sensibles'), host);

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({ message: 'Error interno del servidor' });
  });
});
