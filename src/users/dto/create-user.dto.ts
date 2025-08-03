import { IsEmail, IsString, IsNotEmpty, IsOptional, IsEnum, IsArray, IsUrl } from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsString()
  @IsNotEmpty()
  phoneNumber: string;

  @IsUrl()
  @IsOptional()
  profilePicture?: string; // Cloudinary URL for profile picture

  @IsString()
  @IsOptional()
  extension?: string; // Extension number

  @IsEnum(['client', 'admin', 'sitter'])
  @IsOptional()
  role?: string;

  @IsString()
  @IsNotEmpty()
  address: string;

  @IsString()
  @IsOptional()
  zipCode?: string; // ZIP/Postal code

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  areasCovered?: string[]; // ZIP codes for areas covered (sitters)

  @IsArray()
  @IsEnum(['Cat', 'Dog', 'Bird', 'Rabbit'], { each: true })
  @IsOptional()
  petTypesServiced?: string[]; // Types of pets the sitter services

  @IsString()
  @IsOptional()
  about?: string; // About section for sitters

  @IsString()
  @IsOptional()
  cellPhoneNumber?: string; // Cell phone number

  @IsString()
  @IsOptional()
  homePhoneNumber?: string; // Home phone number

  @IsString()
  @IsNotEmpty()
  emergencyContact: string;

  @IsString()
  @IsNotEmpty()
  homeCareInfo: string;

  @IsEnum(['new', 'existing'])
  @IsOptional()
  customerType?: string;
}
