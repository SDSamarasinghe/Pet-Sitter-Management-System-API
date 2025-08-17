import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AvailabilityController } from './availability.controller';
import { AvailabilityService } from './availability.service';
import { 
  AvailabilitySettings, 
  AvailabilitySettingsSchema 
} from './schemas/availability-settings.schema';
import { 
  AvailabilitySlot, 
  AvailabilitySlotSchema 
} from './schemas/availability-slot.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AvailabilitySettings.name, schema: AvailabilitySettingsSchema },
      { name: AvailabilitySlot.name, schema: AvailabilitySlotSchema },
    ]),
  ],
  controllers: [AvailabilityController],
  providers: [AvailabilityService],
  exports: [AvailabilityService],
})
export class AvailabilityModule {}
