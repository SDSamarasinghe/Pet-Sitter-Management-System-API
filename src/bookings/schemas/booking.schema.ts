import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type BookingDocument = Booking & Document;

@Schema({ timestamps: true })
export class Booking {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId; // Client who made the booking

  @Prop({ type: Types.ObjectId, ref: 'User' })
  sitterId: Types.ObjectId; // Assigned sitter (admin assigns)

  @Prop({ required: true })
  startDate: Date; // Service start date

  @Prop({ required: true })
  endDate: Date; // Service end date

  @Prop({ required: true })
  serviceType: string; // e.g., 'daily care', 'overnight', 'walking', etc.

  @Prop({ required: true })
  numberOfPets: number; // Number of pets

  @Prop({ 
    required: true,
    type: [String],
    enum: ['Cat(s)', 'Dog(s)', 'Rabbit(s)', 'Bird(s)', 'Guinea pig(s)', 'Ferret(s)', 'Other']
  })
  petTypes: string[]; // Types of pets

  @Prop({ 
    required: true, 
    enum: ['pending', 'confirmed', 'assigned', 'completed', 'cancelled'], 
    default: 'pending' 
  })
  status: string;

  @Prop()
  notes: string; // Additional details like medication, special care

  @Prop()
  adminNotes: string; // Admin notes for internal use

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const BookingSchema = SchemaFactory.createForClass(Booking);
