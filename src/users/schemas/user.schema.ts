import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: true })
  password: string;

  @Prop({ required: true })
  firstName: string;

  @Prop({ required: true })
  lastName: string;

  @Prop({ required: true })
  phoneNumber: string;

  @Prop()
  profilePicture: string; // Cloudinary URL for profile picture

  @Prop()
  extension: string; // Extension number (can only be changed once)

  @Prop({ 
    required: true, 
    enum: ['client', 'admin', 'sitter'], 
    default: 'client' 
  })
  role: string;

  @Prop({ required: true })
  address: string;

  @Prop()
  zipCode: string; // ZIP/Postal code

  @Prop({ type: [String] })
  areasCovered: string[]; // ZIP codes for areas covered (sitters)

  @Prop({ type: [String], enum: ['Cat', 'Dog', 'Bird', 'Rabbit'] })
  petTypesServiced: string[]; // Types of pets the sitter services

  @Prop()
  about: string; // About section for sitters

  @Prop()
  cellPhoneNumber: string; // Cell phone number

  @Prop()
  homePhoneNumber: string; // Home phone number

  @Prop() // Pending address change requests (admin approval required)
  pendingAddress: string;

  @Prop({ required: true })
  emergencyContact: string;

  @Prop({ required: true })
  homeCareInfo: string;

  @Prop({ 
    enum: ['new', 'existing'], 
    default: 'new' 
  })
  customerType: string; // New or existing customer

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);
