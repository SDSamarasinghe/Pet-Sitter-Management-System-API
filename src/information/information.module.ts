import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { InformationController } from './information.controller';
import { InformationService } from './information.service';
import { InformationPage, InformationPageSchema } from './schemas/information-page.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: InformationPage.name, schema: InformationPageSchema },
    ]),
  ],
  controllers: [InformationController],
  providers: [InformationService],
  exports: [InformationService],
})
export class InformationModule {}
