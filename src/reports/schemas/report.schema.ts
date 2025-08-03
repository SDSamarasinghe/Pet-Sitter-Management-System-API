import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type ReportDocument = Report & Document;

@Schema({ timestamps: true })
export class Report {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId; // Client who receives the report

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  sitterId: Types.ObjectId; // Sitter who submits the report

  @Prop({ type: Types.ObjectId, ref: 'Booking' })
  bookingId: Types.ObjectId; // Associated booking (optional)

  @Prop({ required: true })
  date: Date;

  @Prop({ required: true })
  details: string; // Report details about the pet care session

  @Prop([String]) // Array of photo URLs from Cloudinary
  photos: string[];

  @Prop({
    enum: ['excellent', 'good', 'fair', 'poor'],
    default: 'good'
  })
  rating: string; // Sitter's assessment of the session

  @Prop()
  recommendations: string; // Any recommendations for future care

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const ReportSchema = SchemaFactory.createForClass(Report);
