import { IsString, IsNotEmpty, IsUrl, IsOptional, IsEnum, IsNumber, Matches } from 'class-validator';

export class CreatePetDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(['Cat(s)', 'Dog(s)', 'Rabbit(s)', 'Bird(s)', 'Guinea pig(s)', 'Ferret(s)', 'Other'])
  @IsOptional()
  type?: string;

  @Matches(/^(https?:\/\/)|(^$)/, { message: 'photo must be a valid URL or empty' })
  @IsOptional()
  photo?: string; // Optional - Azure Blob or Cloudinary URL

  @IsString()
  @IsOptional()
  breed?: string;

  @IsString()
  @IsOptional()
  colouring?: string;

  @IsEnum(['Male', 'Female'])
  @IsOptional()
  gender?: string;

  @IsString()
  @IsOptional()
  dateOfBirth?: string;

  @IsEnum(['Yes', 'No'])
  @IsOptional()
  spayedNeutered?: string;

  @IsString()
  @IsOptional()
  age?: string;

  @IsString()
  @IsOptional()
  species?: string; // Cat, Dog, etc.

  @IsString()
  @IsOptional()
  weight?: string; // Pet weight

  @IsString()
  @IsOptional()
  microchipNumber?: string;

  @IsString()
  @IsOptional()
  rabiesTagNumber?: string;

  @IsString()
  @IsOptional()
  insuranceDetails?: string;

  @IsString()
  @IsOptional()
  vaccinations?: string; // Vaccination history

  @IsString()
  @IsOptional()
  medications?: string; // Current medications

  @IsString()
  @IsOptional()
  allergies?: string; // Known allergies

  @IsString()
  @IsOptional()
  dietaryRestrictions?: string;

  @IsString()
  @IsOptional()
  behaviorNotes?: string;

  @IsString()
  @IsOptional()
  emergencyContact?: string; // Pet-specific emergency contact

  @IsString()
  @IsOptional()
  veterinarianInfo?: string; // Vet contact information

  @IsString()
  @IsOptional()
  careInstructions?: string; // Specific care instructions

  @IsString()
  @IsOptional()
  info?: string; // General pet information and special needs
}
