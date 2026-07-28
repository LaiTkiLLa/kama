import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import * as bodyParser from 'body-parser';

(async () => {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true
  });
  app.use(bodyParser.json({ limit: '50mb' }));
  app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
  app.setGlobalPrefix('api');
  const configService = app.get(ConfigService);
  const PORT = configService.get('serverPort');
  app.enableCors();
  await app.listen(PORT, () => {
    console.warn(`Server started on port: ${PORT}`);
  });
})().catch(console.error);
