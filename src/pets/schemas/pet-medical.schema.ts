import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PetMedicalDocument = PetMedical & Document;

@Schema({ timestamps: true })
export class PetMedical {
  @Prop({ type: Types.ObjectId, ref: 'Pet', required: true })
  petId: Types.ObjectId;

  @Prop()
  vetBusinessName: string; // Vet clinic/business name

  @Prop()
  vetDoctorName: string; // Veterinarian doctor name

  @Prop()
  vetAddress: string; // Veterinary clinic address

  @Prop()
  vetPhoneNumber: string; // Vet contact phone number

  @Prop()
  currentOnVaccines: string; // Vaccination status (e.g., "Fully Vaccinated")

  @Prop()
  onAnyMedication: string; // Current medications and dosage details

  @Prop()
  rabiesTagNumber: string; // Rabies tag number

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const PetMedicalSchema = SchemaFactory.createForClass(PetMedical);
