import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type CommentDocument = Comment & Document;

@Schema({ timestamps: true })
export class Comment {
  @Prop({ type: Types.ObjectId, ref: 'Booking', required: true })
  bookingId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  addedBy: Types.ObjectId;

  @Prop({ required: true })
  body: string;

  @Prop({ 
    required: true,
    enum: ['admin', 'client', 'sitter']
  })
  role: string; // Role of the person who added the comment

  @Prop({ default: false })
  isInternal: boolean; // For admin-only comments

  @Prop({ type: [{
    type: { type: String, enum: ['image', 'document'] },
    url: String,
    filename: String
  }], default: [] })
  attachments: {
    type: 'image' | 'document';
    url: string;
    filename: string;
  }[];

  @Prop({ type: [{
    user: { type: Types.ObjectId, ref: 'User' },
    readAt: { type: Date, default: Date.now }
  }], default: [] })
  readBy: {
    user: Types.ObjectId;
    readAt: Date;
  }[];

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const CommentSchema = SchemaFactory.createForClass(Comment);

// Add indexes for better query performance
CommentSchema.index({ bookingId: 1, createdAt: -1 });
CommentSchema.index({ addedBy: 1 });
CommentSchema.index({ bookingId: 1, isInternal: 1 });
