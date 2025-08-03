import { IsString, IsNotEmpty, IsDateString, IsOptional, IsNumber, IsArray, IsEnum } from 'class-validator';

export class CreateBookingDto {
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
  @IsNotEmpty()
  numberOfPets: number;

  @IsArray()
  @IsEnum(['Cat(s)', 'Dog(s)', 'Rabbit(s)', 'Bird(s)', 'Guinea pig(s)', 'Ferret(s)', 'Other'], { each: true })
  @IsNotEmpty()
  petTypes: string[];

  @IsString()
  @IsOptional()
  notes?: string; // Additional details like medication, special care
}
