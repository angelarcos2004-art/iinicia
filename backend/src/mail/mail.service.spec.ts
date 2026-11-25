import type { ConfigService } from '@nestjs/config';
import nodemailer from 'nodemailer';
import { MailService } from './mail.service.js';

vi.mock('nodemailer', () => ({
  default: { createTransport: vi.fn() },
}));

function makeService(env: Record<string, string> = {}) {
  const config = { get: (key: string, def?: string) => env[key] ?? def } as unknown as ConfigService;
  return new MailService(config);
}

describe('MailService.enviarRecuperacion', () => {
  it('sin MAIL_HOST no lanza (solo queda en el log)', async () => {
    const service = makeService();
    await expect(
      service.enviarRecuperacion('a@b.com', 'http://localhost:3000/restablecer?token=x'),
    ).resolves.toBeUndefined();
  });

  it('con MAIL_HOST configurado, crea el transporte y envía el correo real', async () => {
    const sendMail = vi.fn().mockResolvedValue(undefined);
    vi.mocked(nodemailer.createTransport).mockReturnValue({ sendMail } as never);

    const service = makeService({
      MAIL_HOST: 'smtp.iinicia.test',
      MAIL_PORT: '465',
      MAIL_SECURE: 'true',
      MAIL_USER: 'no-responder@iinicia.org',
      MAIL_PASSWORD: 'secreto',
      MAIL_FROM: 'no-responder@iinicia.org',
    });

    await service.enviarRecuperacion('a@b.com', 'http://localhost:3000/restablecer?token=x');

    expect(nodemailer.createTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        host: 'smtp.iinicia.test',
        port: 465,
        secure: true,
        auth: { user: 'no-responder@iinicia.org', pass: 'secreto' },
      }),
    );
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'a@b.com', from: 'no-responder@iinicia.org' }),
    );
  });

  it('si el SMTP configurado rechaza el envío, no lanza (solo lo registra)', async () => {
    const sendMail = vi.fn().mockRejectedValue(new Error('SMTP timeout'));
    vi.mocked(nodemailer.createTransport).mockReturnValue({ sendMail } as never);
    const service = makeService({ MAIL_HOST: 'smtp.iinicia.test' });

    await expect(
      service.enviarRecuperacion('a@b.com', 'http://localhost:3000/restablecer?token=x'),
    ).resolves.toBeUndefined();
  });

  it('sin MAIL_USER, no arma credenciales de auth (SMTP abierto/sin login)', async () => {
    const sendMail = vi.fn().mockResolvedValue(undefined);
    vi.mocked(nodemailer.createTransport).mockReturnValue({ sendMail } as never);
    makeService({ MAIL_HOST: 'smtp.iinicia.test' });

    expect(nodemailer.createTransport).toHaveBeenCalledWith(
      expect.objectContaining({ auth: undefined }),
    );
  });
});

describe('MailService.enviarCodigo2FA', () => {
  it('sin MAIL_HOST no lanza (solo queda en el log)', async () => {
    const service = makeService();
    await expect(service.enviarCodigo2FA('a@b.com', '123456')).resolves.toBeUndefined();
  });

  it('con MAIL_HOST configurado, envía el código por el transporte real', async () => {
    const sendMail = vi.fn().mockResolvedValue(undefined);
    vi.mocked(nodemailer.createTransport).mockReturnValue({ sendMail } as never);
    const service = makeService({ MAIL_HOST: 'smtp.iinicia.test' });

    await service.enviarCodigo2FA('a@b.com', '123456');

    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'a@b.com', text: expect.stringContaining('123456') }),
    );
  });

  it('si el SMTP configurado rechaza el envío, no lanza (solo lo registra)', async () => {
    const sendMail = vi.fn().mockRejectedValue(new Error('SMTP timeout'));
    vi.mocked(nodemailer.createTransport).mockReturnValue({ sendMail } as never);
    const service = makeService({ MAIL_HOST: 'smtp.iinicia.test' });

    await expect(service.enviarCodigo2FA('a@b.com', '123456')).resolves.toBeUndefined();
  });
});
