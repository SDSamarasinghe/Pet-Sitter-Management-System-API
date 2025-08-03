import { IsString, IsNotEmpty, IsUrl, IsOptional, IsEnum } from 'class-validator';

export class CreatePetDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(['Cat(s)', 'Dog(s)', 'Rabbit(s)', 'Bird(s)', 'Guinea pig(s)', 'Ferret(s)', 'Other'])
  @IsNotEmpty()
  type: string;

  @IsUrl()
  @IsOptional()
  photo?: string; // Optional - Cloudinary URL

  @IsString()
  @IsOptional()
  breed?: string;

  @IsString()
  @IsOptional()
  age?: string;

  @IsString()
  @IsOptional()
  medication?: string; // Medication details

  @IsString()
  @IsNotEmpty()
  info: string; // General pet information and special needs
}
