import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PetCareDocument = PetCare & Document;

@Schema({ timestamps: true })
export class PetCare {
  @Prop({ type: Types.ObjectId, ref: 'Pet', required: true })
  petId: Types.ObjectId;

  @Prop()
  personalityPhobiasPreferences: string; // Personality, any Phobias and Preferences

  @Prop()
  typeOfFood: string; // Type of food

  @Prop()
  dietFoodWaterInstructions: string; // Diet - Food, Water instructions, Quantity and Locations

  @Prop({ enum: ['Yes', 'No'] })
  anyHistoryOfBiting: string; // Any History of Biting

  @Prop()
  locationOfStoredPetFood: string; // Location of Stored Pet Food and Treats

  @Prop()
  litterBoxLocation: string; // Litter Box Location and Additional Litter Location

  @Prop()
  locationOfPetCarrier: string; // Location of Pet Carrier

  @Prop()
  anyAdditionalInfo: string; // Any Additional Info

  @Prop()
  careInstructions: string; // Care instructions

  @Prop()
  feedingSchedule: string; // Feeding schedule details

  @Prop()
  exerciseRequirements: string; // Exercise requirements

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const PetCareSchema = SchemaFactory.createForClass(PetCare);
