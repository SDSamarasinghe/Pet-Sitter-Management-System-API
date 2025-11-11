import { IsEmail, IsString, IsNotEmpty, IsOptional, IsEnum, IsArray, IsUrl, Matches } from 'class-validator';

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

  @Matches(/^(https?:\/\/)|(^$)/, { message: 'profilePicture must be a valid URL or empty' })
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

    // Emergency contact details
    @IsString()
    @IsOptional()
    emergencyContactFirstName?: string;

    @IsString()
    @IsOptional()
    emergencyContactLastName?: string;

    @IsString()
    @IsOptional()
    emergencyContactCellPhone?: string;

    @IsString()
    @IsOptional()
    emergencyContactHomePhone?: string;

    

  @IsString()
  @IsOptional()
  homeCareInfo?: string;

    // Home care details
    @IsString()
    @IsOptional()
    parkingForSitter?: string;

    @IsString()
    @IsOptional()
    garbageCollectionDay?: string;

    @IsString()
    @IsOptional()
    fuseBoxLocation?: string;

    @IsString()
    @IsOptional()
    outOfBoundAreas?: string;

    @IsString()
    @IsOptional()
    videoSurveillance?: string;

    @IsString()
    @IsOptional()
    cleaningSupplyLocation?: string;

    @IsString()
    @IsOptional()
    broomDustpanLocation?: string;

    @IsString()
    @IsOptional()
    mailPickUp?: string;

    @IsString()
    @IsOptional()
    waterIndoorPlants?: string;

    @IsString()
    @IsOptional()
    additionalHomeCareInfo?: string;

      // Key handling details
      @IsEnum(['Concierge', 'Lockbox', 'Keycafe'])
      @IsOptional()
      keyHandlingMethod?: string;

      @IsString()
      @IsOptional()
      keyHandlingInstructions?: string;

      @IsString()
      @IsOptional()
      superintendentContact?: string;

      @IsString()
      @IsOptional()
      friendNeighbourContact?: string;

  @IsEnum(['new', 'existing'])
  @IsOptional()
  customerType?: string;
}
