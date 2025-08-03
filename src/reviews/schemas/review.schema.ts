import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ReviewDocument = Review & Document;

@Schema({ timestamps: true })
export class Review {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  reviewerId: Types.ObjectId; // Who wrote the review

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  revieweeId: Types.ObjectId; // Who is being reviewed

  @Prop({ type: Types.ObjectId, ref: 'Booking' })
  bookingId?: Types.ObjectId; // Related booking

  @Prop({ required: true, min: 1, max: 5 })
  rating: number;

  @Prop({ required: true })
  comment: string;

  @Prop({ 
    enum: ['client_to_sitter', 'sitter_to_client', 'general'], 
    required: true 
  })
  reviewType: string;

  @Prop({ type: [String] })
  tags: string[]; // e.g., 'reliable', 'communicative', 'caring'

  @Prop({ default: true })
  isVisible: boolean; // Admin can hide inappropriate reviews

  @Prop({ default: false })
  isFeatured: boolean; // Featured reviews for homepage

  @Prop()
  adminResponse: string; // Admin response to review if needed

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const ReviewSchema = SchemaFactory.createForClass(Review);
