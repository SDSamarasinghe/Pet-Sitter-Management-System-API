import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PetsController } from './pets.controller';
import { PetCareController } from './controllers/pet-care.controller';
import { PetsService } from './pets.service';
import { PetCareService } from './services/pet-care.service';
import { Pet, PetSchema } from './schemas/pet.schema';
import { PetCare, PetCareSchema } from './schemas/pet-care.schema';
import { PetMedical, PetMedicalSchema } from './schemas/pet-medical.schema';
import { AzureBlobModule } from '../azure-blob/azure-blob.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Pet.name, schema: PetSchema },
      { name: PetCare.name, schema: PetCareSchema },
      { name: PetMedical.name, schema: PetMedicalSchema }
    ]),
    AzureBlobModule
  ],
  controllers: [PetsController, PetCareController],
  providers: [PetsService, PetCareService],
  exports: [PetsService, PetCareService],
})
export class PetsModule {}
