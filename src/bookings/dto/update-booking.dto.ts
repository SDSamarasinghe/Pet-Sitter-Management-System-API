import { PartialType } from '@nestjs/mapped-types';
import { IsString, IsOptional, IsEnum } from 'class-validator';
import { CreateBookingDto } from './create-booking.dto';

export class UpdateBookingDto extends PartialType(CreateBookingDto) {
  @IsEnum(['pending', 'confirmed', 'assigned', 'completed', 'cancelled'])
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  sitterId?: string; // For admin to assign sitter

  @IsString()
  @IsOptional()
  adminNotes?: string; // For admin use
}
