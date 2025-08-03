import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type PetDocument = Pet & Document;

@Schema({ timestamps: true })
export class Pet {
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ required: true })
  name: string;

  @Prop({ 
    required: true,
    enum: ['Cat(s)', 'Dog(s)', 'Rabbit(s)', 'Bird(s)', 'Guinea pig(s)', 'Ferret(s)', 'Other'],
  })
  type: string; // Type of pet

  @Prop() // Optional - Cloudinary URL for pet photo
  photo: string;

  @Prop()
  breed: string; // Pet breed

  @Prop()
  age: string; // Pet age

  @Prop()
  medication: string; // Medication details

  @Prop({ required: true })
  info: string; // General pet information and special needs

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const PetSchema = SchemaFactory.createForClass(Pet);
