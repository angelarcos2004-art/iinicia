import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { cert, initializeApp, type App } from 'firebase-admin/app';
import { getMessaging } from 'firebase-admin/messaging';

/**
 * Envío de notificaciones push (Firebase Cloud Messaging) a la app Android. Requiere un
 * proyecto Firebase real: la cuenta de servicio va en FIREBASE_SERVICE_ACCOUNT (el JSON
 * completo, como string, nunca en el repo). Sin esa variable, no se envía nada de verdad; solo
 * se deja constancia en el log, para no bloquear el flujo que la dispara (admisión, avisos,
 * etc.) mientras no exista el proyecto Firebase.
 */
@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);
  private app: App | null = null;

  constructor(private readonly config: ConfigService) {
    const credencialesJson = this.config.get<string>('FIREBASE_SERVICE_ACCOUNT');
    if (!credencialesJson) {
      this.logger.warn(
        'FIREBASE_SERVICE_ACCOUNT no configurado: las notificaciones push solo se registran en el log.',
      );
      return;
    }
    try {
      const credenciales = JSON.parse(credencialesJson);
      this.app = initializeApp({ credential: cert(credenciales) });
    } catch (error) {
      this.logger.error(`FIREBASE_SERVICE_ACCOUNT inválido, push deshabilitado: ${String(error)}`);
    }
  }

  /**
   * `data` viaja junto a la notificación visible y es lo que Android usa para el deep link al
   * tocarla (p. ej. `{ cursoId: '...' }` abre directo el detalle de ese curso en vez de solo la
   * app). Todos sus valores deben ser string: así los exige FCM.
   */
  async enviar(
    token: string,
    titulo: string,
    mensaje: string,
    data?: Record<string, string>,
  ): Promise<void> {
    if (!this.app) {
      this.logger.log(`[push simulado] -> ${token}: "${titulo}" · "${mensaje}" ${JSON.stringify(data ?? {})}`);
      return;
    }
    try {
      await getMessaging(this.app).send({ token, notification: { title: titulo, body: mensaje }, data });
    } catch (error) {
      this.logger.error(`No se pudo enviar la notificación push: ${String(error)}`);
    }
  }
}
