# `backend/src/main.ts`

**En una frase:** es el punto de arranque del backend: crea la aplicación NestJS, le aplica la configuración de seguridad/CORS/validación y la pone a escuchar peticiones HTTP.

## Por qué existe

Todo programa necesito un punto de entrada. En NestJS ese punto es el archivo que llama a `NestFactory.create(...)` y `app.listen(...)`. Aquí se mantiene deliberadamente mínimo: la configuración "de verdad" (helmet, CORS, pipes de validación, filtro de errores) vive en `app.setup.ts`, no en este archivo. Esa separación existe porque las pruebas end-to-end necesitan exactamente esa misma configuración pero sin arrancar un servidor HTTP real (`app.listen`), así que la comparten importando `setupApp` en vez de duplicarla.

## Recorrido del código

```ts
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const allowedOrigins = (process.env.ALLOWED_ORIGIN ?? 'http://localhost:3000').split(',');
  setupApp(app, allowedOrigins);
  // 3001 = puerto que espera frontend/.env.example (NEXT_PUBLIC_API_URL)
  await app.listen(process.env.PORT ?? 3001);
}
```

- `NestFactory.create(AppModule)` construye el árbol completo de módulos (`AppModule` importa `AuthModule`, `UsersModule`, `MoodleModule`, etc.) y resuelve todas las dependencias por inyección.
- `ALLOWED_ORIGIN` es una lista separada por comas de orígenes permitidos para CORS (por ejemplo, el dominio del portal en producción y `localhost:3000` en desarrollo). Se parte en un arreglo porque `app.enableCors` (dentro de `setupApp`) acepta un arreglo de orígenes.
- El puerto por defecto es `3001` a propósito: tiene que coincidir con el valor que el frontend espera en `NEXT_PUBLIC_API_URL` (ver `frontend/.env.example`), así que cambiarlo aquí sin cambiarlo allá rompe la integración silenciosamente.
- `await bootstrap();` en el nivel superior del archivo usa *top-level await* (posible porque el proyecto compila a ESM, ver `.js` en los imports), en vez del tradicional `bootstrap().catch(...)`.

## Conexión con el resto del sistema

- Importa `AppModule` (el árbol de módulos de toda la aplicación) y `setupApp` (`app.setup.ts`).
- Es el único archivo que llama a `app.listen(...)`: nadie más inicia el servidor HTTP real.
- Las pruebas e2e del backend usan `app.setup.ts` directamente (vía `Test.createTestingModule`) para obtener la misma configuración sin pasar por `main.ts`.

## Cosas que no son obvias a primera vista

- El puerto 3001 no es arbitrario: está acoplado al contrato con el frontend. Si se cambia aquí, hay que actualizar `NEXT_PUBLIC_API_URL` en el portal.
- `ALLOWED_ORIGIN` puede llevar varios orígenes separados por coma (útil si el portal se sirve desde más de un dominio, por ejemplo `www.iinicia.org` y `iinicia.org`).
- Este archivo nunca debe crecer con lógica de seguridad: cualquier middleware/guard/pipe global va en `app.setup.ts` para que las pruebas e2e lo hereden automáticamente.
