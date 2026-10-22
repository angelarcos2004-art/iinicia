import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { setupApp } from './app.setup.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  setupApp(app, process.env.ALLOWED_ORIGIN ?? 'http://localhost:3000');
  // 3001 = puerto que espera frontend/.env.example (NEXT_PUBLIC_API_URL)
  await app.listen(process.env.PORT ?? 3001);
}
await bootstrap();
