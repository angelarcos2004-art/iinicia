import type { ConfigService } from '@nestjs/config';
import { MailService } from './mail.service.js';

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
});
