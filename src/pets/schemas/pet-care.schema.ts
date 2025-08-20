import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PetCareDocument = PetCare & Document;

@Schema({ timestamps: true })
export class PetCare {
  @Prop({ type: Types.ObjectId, ref: 'Pet', required: true })
  petId: Types.ObjectId;

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
