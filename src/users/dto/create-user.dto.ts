import { IsEmail, IsString, IsNotEmpty, IsOptional, IsEnum, IsArray, IsUrl } from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsEnum(['client', 'admin', 'sitter'])
  @IsNotEmpty()
  role: string;

  // Optional fields for full registration
  @IsString()
  @IsOptional()
  password?: string;

  @IsString()
  @IsOptional()
  phoneNumber?: string;

  @IsUrl()
  @IsOptional()
  profilePicture?: string;

  @IsString()
  @IsOptional()
  extension?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  zipCode?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  areasCovered?: string[];

  @IsArray()
  @IsEnum(['Cat', 'Dog', 'Bird', 'Rabbit'], { each: true })
  @IsOptional()
  petTypesServiced?: string[];

  @IsString()
  @IsOptional()
  about?: string;

  @IsString()
  @IsOptional()
  cellPhoneNumber?: string;

  @IsString()
  @IsOptional()
  homePhoneNumber?: string;

  @IsString()
  @IsOptional()
  emergencyContact?: string;

  @IsString()
  @IsOptional()
  homeCareInfo?: string;

  @IsEnum(['new', 'existing'])
  @IsOptional()
  customerType?: string;
}
