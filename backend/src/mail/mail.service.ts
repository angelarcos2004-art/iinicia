import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import nodemailer, { type Transporter } from 'nodemailer';

/**
 * Envío de correo transaccional (hoy solo recuperación de contraseña). Requiere un SMTP real
 * en MAIL_HOST: sin esa variable, el enlace solo se registra en el log, para no bloquear el
 * flujo que lo dispara mientras no exista un proveedor de correo configurado.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: Transporter | null = null;

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

  /**
   * Nunca lanza: un correo que no se pudo enviar no debe tumbar /auth/recuperar, que siempre
   * responde igual exista o no la cuenta (evita delatar qué correos están registrados).
   */
  async enviarRecuperacion(correo: string, enlace: string): Promise<void> {
    const asunto = 'Recupera tu contraseña de IINICIA';
    const texto = `Para restablecer tu contraseña, abre este enlace (expira en 1 hora):\n\n${enlace}\n\nSi no solicitaste esto, ignora este correo.`;
    if (!this.transporter) {
      this.logger.log(`[correo simulado] Para: ${correo} · ${asunto}\n${texto}`);
      return;
    }
    try {
      await this.transporter.sendMail({
        from: this.config.get<string>('MAIL_FROM', 'no-responder@iinicia.org'),
        to: correo,
        subject: asunto,
        text: texto,
      });
    } catch (error) {
      this.logger.error(`No se pudo enviar el correo de recuperación: ${String(error)}`);
    }
  }
}
