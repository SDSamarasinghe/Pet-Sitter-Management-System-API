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

  @Prop({ 
    required: true, 
    enum: ['active', 'pending', 'rejected'], 
    default: 'pending' 
  })
  status: string; // User status for approval workflow

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

    // Emergency contact details
  @Prop()
  emergencyContactFirstName: string;

  @Prop()
  emergencyContactLastName: string;

  @Prop()
  emergencyContactCellPhone: string;

  @Prop()
  emergencyContactHomePhone: string;

  @Prop({ required: true })
  homeCareInfo: string;

    // Home care details
  @Prop()
  parkingForSitter: string;

  @Prop()
  garbageCollectionDay: string;

  @Prop()
  fuseBoxLocation: string;

  @Prop()
  outOfBoundAreas: string;

  @Prop()
  videoSurveillance: string;

  @Prop()
  cleaningSupplyLocation: string;

  @Prop()
  broomDustpanLocation: string;

  @Prop()
  mailPickUp: string;

  @Prop()
  waterIndoorPlants: string;

  @Prop()
  additionalHomeCareInfo: string;

      // Key handling details
  @Prop({ enum: ['Concierge', 'Lockbox', 'Keycafe'] })
  keyHandlingMethod: string;

  @Prop()
  keyHandlingInstructions: string;

  @Prop()
  superintendentContact: string;

  @Prop()
  friendNeighbourContact: string;

  @Prop({ 
    enum: ['new', 'existing'], 
    default: 'new' 
  })
  customerType: string; // New or existing customer

  // Additional profile fields for comprehensive system
  @Prop()
  city: string;

  @Prop()
  state: string;

  @Prop()
  country: string;

  @Prop({ 
    enum: ['apartment', 'house', 'condo', 'townhouse', 'other'], 
  })
  residenceType: string;

  @Prop()
  hasYard: boolean;

  @Prop()
  hasFence: boolean;

  @Prop()
  smokingHousehold: boolean;

  @Prop()
  hasOtherPets: boolean;

  @Prop()
  allergies: string; // Any allergies to be aware of

  @Prop()
  specialRequirements: string;

  // Preferences for clients
  @Prop({ type: [String] })
  preferredSitterGender: string; // 'male', 'female', 'no_preference'

  @Prop()
  preferredSitterAge: string; // Age range preference

  @Prop()
  additionalNotes: string;

  // For sitters
  @Prop()
  experience: string; // Years of experience

  @Prop()
  certifications: string; // Any relevant certifications

  @Prop()
  hourlyRate: number; // Hourly rate for services

  @Prop()
  availability: string; // General availability

  // Password reset fields
  @Prop()
  passwordResetToken: string; // Token for password reset

  @Prop()
  passwordResetExpires: Date; // Expiration time for password reset token

  @Prop({ default: true })
  firstTimeLogin: boolean; // Track if this is user's first login

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Virtual for pets owned by the user
UserSchema.virtual('pets', {
  ref: 'Pet',
  localField: '_id',
  foreignField: 'userId',
});

// Ensure virtuals are included in JSON and Object outputs
UserSchema.set('toObject', { virtuals: true });
UserSchema.set('toJSON', { virtuals: true });
