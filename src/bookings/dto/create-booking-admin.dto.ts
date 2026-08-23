import { 
  IsString, 
  IsNotEmpty, 
  IsDateString, 
  IsOptional, 
  IsNumber, 
  IsArray, 
  IsEnum,
  IsMongoId,
  Min,
  ArrayMinSize,
  ArrayMaxSize,
  ValidateNested
} from 'class-validator';
import { Type } from 'class-transformer';
import { BookingVisitDto } from './booking-visit.dto';

export class CreateBookingAdminDto {
  @IsMongoId()
  @IsNotEmpty()
  userId: string; // Client for whom the booking is being created

  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @IsDateString()
  @IsNotEmpty()
  endDate: string;

  @IsString()
  @IsNotEmpty()
  serviceType: string;

  @IsNumber()
  @Min(1)
  numberOfPets: number;

  @IsArray()
  @IsEnum(['Cat(s)', 'Dog(s)', 'Rabbit(s)', 'Bird(s)', 'Guinea pig(s)', 'Ferret(s)', 'Other'], { each: true })
  @IsNotEmpty()
  petTypes: string[];

  @IsString()
  @IsOptional()
  notes?: string; // Additional details like medication, special care

  @IsMongoId()
  @IsOptional()
  sitterId?: string; // Preferred sitter ID

  @IsNumber()
  @Min(0)
  totalAmount: number;

  @IsString()
  @IsOptional()
  serviceAddress?: string;

  @IsString()
  @IsOptional()
  emergencyContact?: string;

  @IsString()
  @IsOptional()
  emergencyPhone?: string;

  @IsString()
  @IsOptional()
  specialInstructions?: string;

  @IsString()
  @IsOptional()
  clientNotes?: string;

  @IsString()
  @IsOptional()
  adminNotes?: string; // Admin notes when creating booking

  // Explicit per-visit schedule. When present this is authoritative and may
  // contain more than one visit on the same calendar day; startDate/endDate
  // are then only the overall range of the request.
  @IsArray()
  @IsOptional()
  @ArrayMinSize(1)
  @ArrayMaxSize(180)
  @ValidateNested({ each: true })
  @Type(() => BookingVisitDto)
  visitSlots?: BookingVisitDto[];

  // IANA timezone the visit clock times are expressed in (default America/Toronto)
  @IsString()
  @IsOptional()
  timeZone?: string;
}
