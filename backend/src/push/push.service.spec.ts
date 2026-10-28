import type { ConfigService } from '@nestjs/config';
import { PushService } from './push.service.js';

function makeService(env: Record<string, string> = {}) {
  const config = { get: (key: string) => env[key] } as unknown as ConfigService;
  return new PushService(config);
}

describe('PushService.enviar', () => {
  it('sin FIREBASE_SERVICE_ACCOUNT no lanza y no envía nada de verdad', async () => {
    const service = makeService();
    await expect(service.enviar('token-x', 'Título', 'Mensaje')).resolves.toBeUndefined();
  });

  it('con FIREBASE_SERVICE_ACCOUNT inválido (no es JSON) no lanza, solo deshabilita el envío', async () => {
    const service = makeService({ FIREBASE_SERVICE_ACCOUNT: 'esto-no-es-json' });
    await expect(service.enviar('token-x', 'Título', 'Mensaje')).resolves.toBeUndefined();
  });
});
