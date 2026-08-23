import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { BookingVisitDto } from './booking-visit.dto';

/**
 * Ask which sitters are free for a specific set of visits.
 *
 * Checking a whole date range would report a sitter as unavailable because of
 * an unrelated booking that morning, so the visits are sent individually.
 */
export class CheckSitterAvailabilityDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(180)
  @ValidateNested({ each: true })
  @Type(() => BookingVisitDto)
  visitSlots: BookingVisitDto[];

  @IsString()
  @IsOptional()
  timeZone?: string;

  @IsString()
  @IsOptional()
  serviceType?: string;

  @IsArray()
  @IsOptional()
  @IsEnum(['Cat(s)', 'Dog(s)', 'Rabbit(s)', 'Bird(s)', 'Guinea pig(s)', 'Ferret(s)', 'Other'], {
    each: true,
  })
  petTypes?: string[];
}
