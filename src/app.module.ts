import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { join } from 'path';
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

@Module({
  imports: [
    // Configuration module to load environment variables
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    
    // MongoDB connection using Mongoose
    MongooseModule.forRoot(process.env.MONGODB_URI),
    
    // Mailer configuration
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        transport: {
          host: configService.get('MAIL_HOST', 'smtp.gmail.com'),
          port: configService.get('MAIL_PORT', 587),
          secure: false,
          auth: {
            user: configService.get('MAIL_USER'),
            pass: configService.get('MAIL_PASS'),
          },
        },
        defaults: {
          from: `"Flying Duchess Pet-Sitting" <${configService.get('MAIL_FROM', 'noreply@flyingduchess.com')}>`,
        },
        template: {
          dir: process.env.NODE_ENV === 'production' 
            ? join(__dirname, 'users', 'templates')
            : join(process.cwd(), 'src', 'users', 'templates'),
          adapter: new HandlebarsAdapter(),
          options: {
            strict: true,
          },
        },
      }),
      inject: [ConfigService],
    }),
    
    // Feature modules
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
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
