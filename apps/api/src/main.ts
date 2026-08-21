import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { mcpStrategy } from './balance/balance.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  mcpStrategy.setHttpAdapter(app.getHttpAdapter());
  app.connectMicroservice({ strategy: mcpStrategy });
  await app.startAllMicroservices();
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
