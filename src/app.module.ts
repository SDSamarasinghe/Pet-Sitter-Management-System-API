import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/adapters/handlebars.adapter';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { join } from 'path';

import { envValidationSchema } from './common/config/env.validation';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { PetsModule } from './pets/pets.module';
import { ReportsModule } from './reports/reports.module';
import { BookingsModule } from './bookings/bookings.module';
import { CloudinaryModule } from './cloudinary/cloudinary.module';
import { KeySecurityModule } from './key-security/key-security.module';
import { InvoicesModule } from './invoices/invoices.module';
import { ReviewsModule } from './reviews/reviews.module';
import { InformationModule } from './information/information.module';
import { CommentsModule } from './comments/comments.module';
import { NotesModule } from './notes/notes.module';
import { AzureBlobModule } from './azure-blob/azure-blob.module';
import { UploadModule } from './upload/upload.module';
import { AvailabilityModule } from './availability/availability.module';
import { EmailModule } from './email/email.module';
import { HealthController } from './health/health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validationSchema: envValidationSchema,
      validationOptions: { abortEarly: false },
    }),

    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI'),
      }),
      inject: [ConfigService],
    }),

    ThrottlerModule.forRoot([
      { name: 'short', ttl: 1000, limit: 10 },
      { name: 'medium', ttl: 10_000, limit: 50 },
      { name: 'long', ttl: 60_000, limit: 200 },
    ]),

    MailerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const mailPort = Number(configService.get('MAIL_PORT', 587));
        const mailUser = configService.get<string>('MAIL_USER');
        const mailPass = configService.get<string>('MAIL_PASS');
        const mailHost = configService.get<string>('MAIL_HOST', 'smtp.gmail.com');
        const mailFrom = configService.get<string>('MAIL_FROM', 'noreply@flyingduchess.com');

        return {
          transport: {
            host: mailHost,
            port: mailPort,
            secure: mailPort === 465,
            auth: mailUser && mailPass ? { user: mailUser, pass: mailPass } : undefined,
          },
          defaults: { from: `"Whiskarz Pet-Sitting" <${mailFrom}>` },
          template: {
            dir:
              process.env.NODE_ENV === 'production'
                ? join(__dirname, 'users', 'templates')
                : join(process.cwd(), 'src', 'users', 'templates'),
            adapter: new HandlebarsAdapter(),
            options: { strict: true },
          },
        };
      },
      inject: [ConfigService],
    }),

    AuthModule,
    UsersModule,
    PetsModule,
    BookingsModule,
    ReportsModule,
    CloudinaryModule,
    KeySecurityModule,
    InvoicesModule,
    ReviewsModule,
    InformationModule,
    CommentsModule,
    NotesModule,
    AzureBlobModule,
    UploadModule,
    AvailabilityModule,
    EmailModule,
  ],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
