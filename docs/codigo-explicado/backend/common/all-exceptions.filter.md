# `backend/src/common/all-exceptions.filter.ts`

**En una frase:** filtro global de excepciones: sin importar qué error ocurra en cualquier parte del backend, la respuesta HTTP siempre tiene la misma forma, `{ message: string }`.

## Por qué existe

El frontend necesita un contrato predecible para mostrar errores al usuario: siempre lee `error.message` de la respuesta. Sin un filtro global, distintas partes de Nest (excepciones HTTP normales, el límite de peticiones de Throttler, un error de programación no previsto) devolverían formas de respuesta distintas, y el frontend tendría que manejar cada caso por separado — o, peor, algún error se filtraría sin manejar y expondría detalles internos (como un stack trace) directamente al cliente.

## Recorrido del código

```ts
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const res = host.switchToHttp().getResponse<Response>();

    if (exception instanceof ThrottlerException) {
      res.status(exception.getStatus()).json({ message: 'Demasiados intentos. Espera un minuto e intenta de nuevo.' });
      return;
    }

    if (exception instanceof HttpException) {
      res.status(exception.getStatus()).json({ message: this.extract(exception) });
      return;
    }

    this.logger.error(exception instanceof Error ? exception.stack : String(exception));
    res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: 'Error interno del servidor' });
  }
  ...
}
```
`@Catch()` sin argumentos significa que este filtro intercepta **cualquier** excepción, no solo las de un tipo específico. Hay tres ramas, en orden de especificidad:
1. `ThrottlerException` (el límite de peticiones de `@nestjs/throttler`) se traduce a un mensaje amigable en español, en vez del mensaje genérico en inglés que la librería produciría por defecto.
2. Cualquier otra `HttpException` (las que lanzan los controladores/servicios a propósito: `BadRequestException`, `NotFoundException`, `ForbiddenException`, `UnauthorizedException`, etc.) conserva su código de estado HTTP original, pero el cuerpo se normaliza con `extract(...)`.
3. **Cualquier cosa que no sea una `HttpException`** (un error de programación inesperado, una excepción de la base de datos no capturada, etc.) se registra en el log con su stack trace completo — para que quede constancia para quien revise los logs del servidor — pero al cliente solo se le devuelve un mensaje genérico `"Error interno del servidor"`, sin detalles internos. Esto evita que el backend filtre accidentalmente información sensible (rutas de archivos, nombres de tablas, mensajes de la librería de base de datos) en una respuesta pública.

```ts
private extract(exception: HttpException): string {
  const body = exception.getResponse();
  if (typeof body === 'string') return body;
  const message = (body as { message?: string | string[] }).message;
  if (Array.isArray(message)) return message[0] ?? exception.message;
  return message ?? exception.message;
}
```
Nest permite que una `HttpException` tenga un cuerpo de distintas formas (un string simple, o un objeto con `message` como string o como arreglo de strings — este último es, por ejemplo, el formato que produciría `class-validator` sin el `exceptionFactory` personalizado de `app.setup.ts`). `extract` normaliza cualquiera de esas formas a un solo string, tomando el primer mensaje si llegara un arreglo.

## Conexión con el resto del sistema

- Se registra como filtro global en `app.setup.ts` (`app.useGlobalFilters(new AllExceptionsFilter())`), así que aplica a absolutamente todas las rutas de todos los módulos.
- Complementa al `ValidationPipe` de `app.setup.ts`, que ya produce sus errores en una forma que `extract` puede leer directamente.
- Es la razón por la que, en toda la documentación de los controladores de este backend, se puede decir con confianza que un error siempre llega al cliente como `{ message: string }`.

## Cosas que no son obvias a primera vista

- La rama de `ThrottlerException` existe por separado de la rama general de `HttpException` únicamente para poder personalizar el texto del mensaje a español; técnicamente `ThrottlerException` también es una `HttpException`, así que sin esa rama especial habría caído en la rama genérica con un mensaje menos claro para el usuario final.
- Este filtro es, en la práctica, la última línea de defensa contra la fuga accidental de información interna: cualquier error no anticipado termina oculto detrás de "Error interno del servidor", sin importar qué tan específico o revelador sea el error real (que sí queda en el log del servidor, no se pierde, solo no se expone).
