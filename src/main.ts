import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { json, urlencoded } from 'express';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  process.env.TZ = 'UTC';
  
  const app = await NestFactory.create(AppModule);
  
  // Increase body size limit for file uploads (10MB)
  app.use(json({ limit: '10mb' }));
  app.use(urlencoded({ limit: '10mb', extended: true }));
  
  // Enable CORS for frontend integration
  const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:3000')
    .split(',')
    .map((o) => o.trim());
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });
  
  // Enable validation pipes for DTO validation
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));
  
  // Global exception filter
  app.useGlobalFilters(new AllExceptionsFilter());
  
  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`Whiskerz Pet-Sitting API is running on port ${port} (UTC timezone)`);
}
bootstrap();
