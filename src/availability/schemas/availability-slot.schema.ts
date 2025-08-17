import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AvailabilitySlotDocument = AvailabilitySlot & Document;

@Schema({ timestamps: true })
export class AvailabilitySlot {
  @Prop({ required: true, type: Types.ObjectId, ref: 'User' })
  sitterId: Types.ObjectId;

  @Prop({ required: true })
  date: Date;

  @Prop({ required: true })
  startTime: string; // Format: "HH:mm"

  @Prop({ required: true })
  endTime: string; // Format: "HH:mm"

  @Prop({ required: true, default: true })
  isAvailable: boolean;

  @Prop({ required: false, type: Types.ObjectId, ref: 'Booking' })
  bookingId?: Types.ObjectId; // If slot is booked

  @Prop({ required: false })
  notes?: string;

  @Prop({ required: true, default: 'regular' })
  slotType: string; // 'regular', 'emergency', 'holiday'

  @Prop({ required: false })
  customRate?: number; // Override default rate for this slot
}

export const AvailabilitySlotSchema = SchemaFactory.createForClass(AvailabilitySlot);
