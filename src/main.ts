import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { json, urlencoded } from 'express';

async function bootstrap() {
  process.env.TZ = 'UTC';
  
  const app = await NestFactory.create(AppModule);
  
  // Increase body size limit for file uploads (10MB)
  app.use(json({ limit: '10mb' }));
  app.use(urlencoded({ limit: '10mb', extended: true }));
  
  // Enable CORS for frontend integration
  app.enableCors({
    origin: true,
    credentials: true,
  });
  
  // Enable validation pipes for DTO validation
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));
  
  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`Whiskerz Pet-Sitting API is running on port ${port} (UTC timezone)`);
}
bootstrap();
