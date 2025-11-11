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

  @Prop() // Optional - Photo URL from Azure Blob Storage
  photo: string;

  @Prop() // Optional - Additional photos array
  photos: string[];

  @Prop()
  breed: string; // Pet breed

  @Prop()
  colouring: string; // Pet colouring/color

  @Prop({ enum: ['Male', 'Female'] })
  gender: string; // Pet gender

  @Prop()
  dateOfBirth: string; // Date of birth (YYYY/MM/DD)

  @Prop({ enum: ['Yes', 'No'] })
  spayedNeutered: string; // Spayed or Neutered status

  @Prop()
  age: string; // Pet age

  @Prop()
  species: string; // Cat, Dog, etc.

  @Prop()
  weight: string; // Pet weight

  @Prop()
  microchipNumber: string;

  @Prop()
  rabiesTagNumber: string; // Rabies tag number

  @Prop()
  insuranceDetails: string; // Pet insurance information

  @Prop()
  vaccinations: string; // Vaccination history

  @Prop()
  medications: string; // Current medications

  @Prop()
  allergies: string; // Known allergies

  @Prop()
  dietaryRestrictions: string;

  @Prop()
  behaviorNotes: string;

  @Prop()
  emergencyContact: string; // Pet-specific emergency contact

  @Prop()
  veterinarianInfo: string; // Vet contact information

  @Prop()
  careInstructions: string; // Specific care instructions

  @Prop({ required: true })
  info: string; // General pet information and special needs

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const PetSchema = SchemaFactory.createForClass(Pet);
