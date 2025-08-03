import { IsEmail, IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';

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

  @IsEnum(['client', 'admin', 'sitter'])
  @IsOptional()
  role?: string;

  @IsString()
  @IsNotEmpty()
  address: string;

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
