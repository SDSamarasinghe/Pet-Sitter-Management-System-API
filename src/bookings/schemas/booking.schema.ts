import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type BookingDocument = Booking & Document;

@Schema({ timestamps: true })
export class Booking {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId; // Client who made the booking

  @Prop({ type: Types.ObjectId, ref: 'User' })
  sitterId: Types.ObjectId; // Assigned sitter (admin assigns)

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId; // Who created the booking (client themselves or admin)

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
    enum: ['pending', 'confirmed', 'assigned', 'in_progress', 'completed', 'cancelled'], 
    default: 'pending' 
  })
  status: string;

  @Prop()
  notes: string; // Additional details like medication, special care

  @Prop()
  adminNotes: string; // Admin notes for internal use

  @Prop()
  clientNotes: string; // Client's notes and instructions

  @Prop()
  sitterNotes: string; // Sitter's notes and updates

  // Pricing and payment information
  @Prop({ required: true })
  totalAmount: number;

  @Prop({ default: 0 })
  paidAmount: number;

  @Prop({ 
    enum: ['pending', 'partial', 'paid', 'refunded'], 
    default: 'pending' 
  })
  paymentStatus: string;

  @Prop()
  paymentDate: Date;

  @Prop({ 
    enum: ['credit_card', 'bank_transfer', 'cash', 'check'], 
  })
  paymentMethod: string;

  // Service details
  @Prop()
  serviceAddress: string; // Where service will be provided

  @Prop()
  emergencyContact: string;

  @Prop()
  emergencyPhone: string;

  @Prop()
  specialInstructions: string;

  // Visit tracking
  @Prop({ type: [{ 
    date: Date, 
    notes: String, 
    photos: [String], // Cloudinary URLs
    duration: Number, // in minutes
    activities: [String]
  }] })
  visits: {
    date: Date;
    notes: string;
    photos: string[];
    duration: number;
    activities: string[];
  }[];

  // Cancellation info
  @Prop()
  cancellationReason: string;

  @Prop()
  cancellationDate: Date;

  @Prop({ default: 0 })
  cancellationFee: number;

  // Reviews and ratings
  @Prop({ min: 1, max: 5 })
  clientRating: number;

  @Prop()
  clientReview: string;

  @Prop({ min: 1, max: 5 })
  sitterRating: number;

  @Prop()
  sitterReview: string;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const BookingSchema = SchemaFactory.createForClass(Booking);
