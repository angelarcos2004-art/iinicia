# `backend/src/mail/mail.service.ts`

**En una frase:** envía los dos correos transaccionales del sistema (recuperación de contraseña y código de verificación en dos pasos) por SMTP real, o los simula en el log si todavía no hay un proveedor de correo configurado.

## Por qué existe

Durante el desarrollo (o en un ambiente donde todavía no se ha configurado un proveedor SMTP real), el flujo de login con 2FA y de recuperación de contraseña no debe romperse por completo: este servicio degrada con gracia a "modo simulado", registrando el contenido del correo en el log en vez de enviarlo, para que el desarrollo y las pruebas puedan seguir sin depender de credenciales de correo reales.

## Recorrido del código

```ts
constructor(private readonly config: ConfigService) {
  const host = this.config.get<string>('MAIL_HOST');
  if (!host) {
    this.logger.warn('MAIL_HOST no configurado: los correos solo se registran en el log.');
    return;
  }
  const user = this.config.get<string>('MAIL_USER');
  this.transporter = nodemailer.createTransport({
    host,
    port: Number(this.config.get<string>('MAIL_PORT', '587')),
    secure: this.config.get<string>('MAIL_SECURE', 'false') === 'true',
    auth: user ? { user, pass: this.config.get<string>('MAIL_PASSWORD') } : undefined,
  });
}
```
Si `MAIL_HOST` no está en el `.env`, `this.transporter` se queda en `null` y cada método de envío cae a `logger.log('[correo simulado] ...')`. Es la misma estrategia de "modo simulado por defecto" que usa `PushService` para Firebase.

```ts
async enviarRecuperacion(correo: string, enlace: string): Promise<void> {
  ...
  if (!this.transporter) {
    this.logger.log(`[correo simulado] Para: ${correo} · ${asunto}\n${texto}`);
    return;
  }
  try {
    await this.transporter.sendMail({ ... });
  } catch (error) {
    this.logger.error(`No se pudo enviar el correo de recuperación: ${String(error)}`);
  }
}
```
El `try/catch` que envuelve el envío real **nunca relanza** el error. El comentario del código explica por qué: "un correo que no se pudo enviar no debe tumbar `/auth/recuperar`, que siempre responde igual exista o no la cuenta" — si el envío lanzara y el controlador no lo capturara, una falla de SMTP terminaría devolviendo un 500 justo en el único endpoint donde la respuesta debe ser indistinguible sin importar qué pasó internamente (ver `auth.service.md`, sección de recuperación de contraseña).

`enviarCodigo2FA` sigue exactamente el mismo patrón (modo simulado si no hay transporter, nunca relanza en caso de error), por la misma razón: una falla de correo no debe tumbar `/auth/login`.

## Conexión con el resto del sistema

- Lo usa únicamente `AuthService`, para los dos flujos que necesitan enviar correo: recuperación de contraseña y 2FA de login.
- Depende de `nodemailer` y de las variables `MAIL_HOST`, `MAIL_USER`, `MAIL_PASSWORD`, `MAIL_PORT`, `MAIL_SECURE`, `MAIL_FROM`.

## Cosas que no son obvias a primera vista

- Ambos métodos de envío son "best effort": el llamador (`AuthService`) nunca necesita envolver la llamada en su propio `try/catch`, porque este servicio garantiza no lanzar. Eso significa que, si el correo de verificación nunca llega por un problema de SMTP, el usuario no se entera de ese detalle técnico — solo seguiría esperando un código que jamás llegó. Es una decisión consciente de priorizar la no-interrupción del flujo de autenticación por encima de reportar errores de infraestructura al usuario final.
- El modo simulado registra el **contenido completo** del correo (incluyendo el enlace de recuperación o el código de 6 dígitos) en el log del servidor — aceptable en desarrollo, pero algo a tener presente si esos logs se comparten o se suben a un sistema de monitoreo sin control de acceso.
