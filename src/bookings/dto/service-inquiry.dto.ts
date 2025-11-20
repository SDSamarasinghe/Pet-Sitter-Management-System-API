import { IsString, IsNotEmpty, IsDateString, IsOptional, IsNumber, IsArray, IsEnum, IsEmail } from 'class-validator';

export class ServiceInquiryDto {
  @IsEnum(['new', 'existing'])
  @IsNotEmpty()
  customerType: string; // "I am a new customer" or "I am an existing customer"

  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsString()
  @IsNotEmpty()
  address: string; // Address including unit number and postal code

  @IsNumber()
  @IsNotEmpty()
  numberOfPets: number;

  @IsArray()
  @IsEnum(['Cat(s)', 'Dog(s)', 'Rabbit(s)', 'Bird(s)', 'Guinea pig(s)', 'Ferret(s)', 'Other'], { each: true })
  @IsNotEmpty()
  petTypes: string[];

  @IsString()
  @IsOptional()
  service?: string; // Service type selected from dropdown

  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @IsDateString()
  @IsNotEmpty()
  endDate: string;

  @IsString()
  @IsOptional()
  startTime?: string; // Time in HH:mm format

  @IsString()
  @IsOptional()
  endTime?: string; // Time in HH:mm format

  @IsString()
  @IsOptional()
  timeZone?: string; // Client timezone (e.g., 'America/Toronto')

  @IsString()
  @IsNotEmpty()
  phoneNumber: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsOptional()
  additionalDetails?: string; // Any additional details such as medication
}
