import { 
  IsString, 
  IsNotEmpty, 
  IsDateString, 
  IsOptional, 
  IsNumber, 
  IsArray, 
  IsEnum,
  IsMongoId,
  Min
} from 'class-validator';

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
}
