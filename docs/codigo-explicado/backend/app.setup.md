# `backend/src/app.setup.ts`

**En una frase:** configura, en un solo lugar, todo lo que protege a la API (cabeceras de seguridad HTTP, CORS, validación de entrada y el formato de los errores), para que tanto `main.ts` como las pruebas e2e usen exactamente la misma configuración.

## Por qué existe

Si la configuración de seguridad viviera dentro de `main.ts`, las pruebas end-to-end (que construyen la app con `Test.createTestingModule(...).compile()` y nunca llaman a `main.ts`) correrían sin helmet, sin CORS y sin el pipe de validación — es decir, probarían un backend más permisivo que el real. Extraer esto a una función exportada (`setupApp`) garantiza que lo que se prueba es exactamente lo que corre en producción.

## Recorrido del código

```ts
app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: false,
      directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"], objectSrc: ["'none'"] },
    },
  }),
);
```
El backend es una API JSON pura, salvo una excepción: `GET /documentos/:id/archivo` (ver `documentos.controller.ts`), que sirve el PDF/JPG/PNG que subió un aspirante con `Content-Disposition: inline`, es decir, el navegador lo muestra directamente en vez de forzar la descarga. Por eso la CSP es lo más restrictiva posible (`'none'` en todo): si alguien lograra subir un archivo malicioso disfrazado de PDF, esta política evita que se ejecute nada (scripts, iframes, objetos) en el origen del backend al abrirlo.

```ts
app.enableCors({ origin: allowedOrigin });
```
Solo el origen (u orígenes) configurado en `ALLOWED_ORIGIN` puede hacer peticiones desde un navegador. Esto es lo que impide que cualquier sitio web ajeno llame a la API usando la sesión de otra persona.

```ts
app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: false,
    exceptionFactory: (errors) =>
      new BadRequestException(
        Object.values(errors[0]?.constraints ?? {})[0] ?? 'Datos inválidos',
      ),
  }),
);
```
- `whitelist: true` descarta silenciosamente cualquier propiedad del body que no esté declarada en el DTO (por ejemplo, si alguien manda `{ correo, password, esSuperadmin: true }` a `/auth/login`, `esSuperadmin` simplemente se elimina antes de llegar al controlador).
- `forbidNonWhitelisted: false` significa que esas propiedades extra no rechazan la petición, solo se ignoran (más tolerante que lanzar error).
- `exceptionFactory` personalizado: por defecto Nest devolvería un arreglo completo de errores de validación; aquí se reduce a un solo mensaje de texto (`{ message: string }`), porque así es como el frontend espera leer los errores (ver `AllExceptionsFilter`, que estandariza ese mismo formato para todos los demás errores).

```ts
app.useGlobalFilters(new AllExceptionsFilter());
```
Registra el filtro que convierte cualquier excepción (de Nest, de Throttler, o un error inesperado) al mismo formato `{ message }` — ver `docs/codigo-explicado/backend/common/all-exceptions.filter.md`.

## Conexión con el resto del sistema

- La llama `main.ts` al arrancar el servidor real.
- La llaman las pruebas e2e del backend (`*.spec.ts` que levantan la app completa) para probar contra la misma configuración de seguridad.
- Depende de `AllExceptionsFilter` (`common/`).

## Cosas que no son obvias a primera vista

- La CSP ultra-restrictiva no es un descuido ni "falta de diseño": es intencional porque el backend sirve un archivo binario subido por un usuario no confiable (el aspirante) y se quiere que ese archivo nunca pueda ejecutar código en el dominio del backend.
- `whitelist: true` es, en la práctica, la primera línea de defensa contra que alguien intente mandar campos como `rol` o `moodleUserId` directamente en el body de un registro para auto-asignarse privilegios; los DTOs son la única fuente de verdad de qué campos se aceptan.
- Esta función no monta las rutas: solo configura middlewares/guards/pipes globales. Las rutas vienen de los controladores de cada módulo importado en `AppModule`.
