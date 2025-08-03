import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { PetsModule } from './pets/pets.module';
import { ReportsModule } from './reports/reports.module';
import { BookingsModule } from './bookings/bookings.module';
import { CloudinaryModule } from './cloudinary/cloudinary.module';

@Module({
  imports: [
    // Configuration module to load environment variables
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    
    // MongoDB connection using Mongoose
    MongooseModule.forRoot(process.env.MONGODB_URI),
    
    // Feature modules
    AuthModule,
    UsersModule,
    PetsModule,
    BookingsModule,
    ReportsModule,
    CloudinaryModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
