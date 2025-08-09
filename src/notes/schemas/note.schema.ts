import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type NoteDocument = Note & Document;

@Schema({ _id: false })
export class NoteAttachment {
  @Prop({ required: true, enum: ['image', 'document'] })
  type: 'image' | 'document';

  @Prop({ required: true })
  url: string;

  @Prop({ required: true })
  filename: string;
}

@Schema({ _id: false })
export class NoteReply {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  senderId: Types.ObjectId;

  @Prop({ required: true })
  text: string;

  @Prop({ type: [NoteAttachment], default: [] })
  attachments: NoteAttachment[];

  @Prop({ default: Date.now })
  createdAt: Date;
}

@Schema({ timestamps: true })
export class Note {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  senderId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  recipientId: Types.ObjectId;

  @Prop({ required: true })
  text: string;

  @Prop({ type: [NoteAttachment], default: [] })
  attachments: NoteAttachment[];

  @Prop({ type: [NoteReply], default: [] })
  replies: NoteReply[];

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const NoteSchema = SchemaFactory.createForClass(Note);
export const NoteAttachmentSchema = SchemaFactory.createForClass(NoteAttachment);
export const NoteReplySchema = SchemaFactory.createForClass(NoteReply);
