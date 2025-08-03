import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type KeySecurityDocument = KeySecurity & Document;

@Schema({ timestamps: true })
export class KeySecurity {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  clientId: Types.ObjectId;

  @Prop()
  lockboxCode: string;

  @Prop()
  lockboxLocation: string;

  @Prop()
  alarmCode: string;

  @Prop()
  alarmInstructions: string;

  @Prop()
  specialInstructions: string;

  @Prop()
  comments: string;

  @Prop({ type: [String] })
  othersWithAccess: string[]; // List of people who have access

  @Prop({ type: [String] })
  emergencyContacts: string[]; // Emergency contacts

  @Prop()
  keyLocation: string; // Where physical keys are located

  @Prop()
  gateCode: string;

  @Prop()
  wifiNetwork: string;

  @Prop()
  wifiPassword: string;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const KeySecuritySchema = SchemaFactory.createForClass(KeySecurity);
