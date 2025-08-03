import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type MessageThreadDocument = MessageThread & Document;

@Schema({ timestamps: true })
export class MessageThread {
  @Prop({ type: [{ type: Types.ObjectId, ref: 'User' }], required: true })
  participants: Types.ObjectId[];

  @Prop({ required: true })
  subject: string;

  @Prop({ type: Types.ObjectId, ref: 'Message' })
  lastMessageId?: Types.ObjectId;

  @Prop({ default: Date.now })
  lastActivity: Date;

  @Prop({ 
    enum: ['booking', 'general', 'support', 'emergency'], 
    default: 'general' 
  })
  category: string;

  @Prop({ type: Types.ObjectId, ref: 'Booking' })
  relatedBookingId?: Types.ObjectId; // If thread is related to a specific booking

  @Prop({ default: false })
  isArchived: boolean;

  @Prop({ default: false })
  isPinned: boolean;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const MessageThreadSchema = SchemaFactory.createForClass(MessageThread);
