# `backend/src/push/push.service.ts`

**En una frase:** envía notificaciones push a la app Android vía Firebase Cloud Messaging (FCM), siempre como "data message" para forzar que la propia app decida cómo mostrarlas; sin credenciales de Firebase, solo las simula en el log.

## Por qué existe

Las notificaciones controladas a estudiantes (`docs/requerimientos.md` CA-14) necesitan un canal real hacia dispositivos Android. Firebase es el estándar para eso. Igual que `MailService`, este servicio no debe bloquear el flujo que dispara una notificación (admisión, aviso de un profesor, etc.) solo porque el proyecto de Firebase todavía no está configurado.

## Recorrido del código

```ts
constructor(private readonly config: ConfigService) {
  const credencialesJson = this.config.get<string>('FIREBASE_SERVICE_ACCOUNT');
  if (!credencialesJson) {
    this.logger.warn('FIREBASE_SERVICE_ACCOUNT no configurado: las notificaciones push solo se registran en el log.');
    return;
  }
  try {
    const credenciales = JSON.parse(credencialesJson);
    this.app = initializeApp({ credential: cert(credenciales) });
  } catch (error) {
    this.logger.error(`FIREBASE_SERVICE_ACCOUNT inválido, push deshabilitado: ${String(error)}`);
  }
}
```
La cuenta de servicio completa de Firebase (un JSON con claves privadas) se guarda como una sola variable de entorno de texto (`FIREBASE_SERVICE_ACCOUNT`), nunca como archivo en el repositorio — coherente con la regla general de "nunca subir `.env` al repositorio" de `CLAUDE.md`, aplicada aquí a un secreto especialmente sensible (permite enviar notificaciones en nombre del proyecto Firebase completo).

```ts
async enviar(token: string, titulo: string, mensaje: string, data?: Record<string, string>): Promise<void> {
  const payload = { titulo, mensaje, ...(data ?? {}) };
  if (!this.app) {
    this.logger.log(`[push simulado] -> ${token}: ${JSON.stringify(payload)}`);
    return;
  }
  try {
    await getMessaging(this.app).send({ token, data: payload });
  } catch (error) {
    this.logger.error(`No se pudo enviar la notificación push: ${String(error)}`);
  }
}
```
El punto más importante de este método está en lo que **no** se envía: nunca se usa el bloque `notification` de FCM (el que Android muestra automáticamente con el ícono/acción por defecto del sistema), solo `data`. El comentario del código explica la razón exacta: con un mensaje combinado (`notification` + `data`), Android solo invoca el código de la app (`onMessageReceived`) cuando la app está en primer plano; en segundo plano o cerrada, el sistema operativo muestra la notificación él mismo, con su UI genérica, **ignorando** cualquier deep link personalizado y la preferencia de "notificaciones configurables por el usuario" que pide el requerimiento 9.3. Usando solo `data`, el mensaje siempre pasa por el código de la app Android, sin excepción, sea cual sea el estado de la app.

## Conexión con el resto del sistema

- Lo usa únicamente `UsuariosController.notificar`.
- `data` incluye `cursoId` cuando la notificación se refiere a un curso específico, para que la app Android pueda abrir directamente ese curso al tocar la notificación (deep link).
- Depende de `firebase-admin` y de la variable `FIREBASE_SERVICE_ACCOUNT`.

## Cosas que no son obvias a primera vista

- Que las notificaciones sean solo `data` significa que es responsabilidad de la app Android construir y mostrar la notificación visible al usuario (usando `titulo`/`mensaje` del payload) — este servicio nunca delega esa parte a Android/FCM automáticamente.
- Igual que `MailService`, `enviar` nunca relanza un error de Firebase hacia quien la llamó: una falla al enviar un push no debe tumbar, por ejemplo, el endpoint `POST /usuarios/:id/notificar` con un 500 genérico.
