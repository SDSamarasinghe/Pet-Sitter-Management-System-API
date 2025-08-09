import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type MessageDocument = Message & Document;

@Schema({ timestamps: true })
export class Message {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  senderId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  receiverId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'MessageThread', required: true })
  threadId: Types.ObjectId;

  @Prop({ required: true })
  content: string;

  @Prop({ type: Types.ObjectId, ref: 'Message' })
  replyToId?: Types.ObjectId; // For replies to specific messages

  @Prop({ default: false })
  isRead: boolean;

  @Prop({ default: Date.now })
  readAt?: Date;

  @Prop({ 
    enum: ['message', 'note', 'system'], 
    default: 'message' 
  })
  type: string;

  @Prop({ type: [String] })
  attachments?: string[]; // Cloudinary URLs for attachments

  @Prop({ default: false })
  isDeleted: boolean;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const MessageSchema = SchemaFactory.createForClass(Message);
