import { IsString, IsNotEmpty, IsDateString, IsOptional, IsEnum, IsArray, IsUrl } from 'class-validator';

export class CreateReportDto {
  @IsString()
  @IsNotEmpty()
  userId: string; // Client who receives the report

  @IsString()
  @IsOptional()
  bookingId?: string; // Associated booking

  @IsDateString()
  @IsNotEmpty()
  date: string;

  @IsString()
  @IsNotEmpty()
  details: string;

  @IsArray()
  @IsUrl({}, { each: true })
  @IsOptional()
  photos?: string[]; // Cloudinary URLs

  @IsEnum(['excellent', 'good', 'fair', 'poor'])
  @IsOptional()
  rating?: string;

  @IsString()
  @IsOptional()
  recommendations?: string;
}
