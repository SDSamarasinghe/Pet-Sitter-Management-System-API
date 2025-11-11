import { IsString, IsOptional, IsMongoId, IsEnum } from 'class-validator';

export class CreatePetCareDto {
  @IsString()
  petId: string;

  @IsString()
  @IsOptional()
  personalityPhobiasPreferences?: string;

  @IsString()
  @IsOptional()
  typeOfFood?: string;

  @IsString()
  @IsOptional()
  dietFoodWaterInstructions?: string;

  @IsEnum(['Yes', 'No'])
  @IsOptional()
  anyHistoryOfBiting?: string;

  @IsString()
  @IsOptional()
  locationOfStoredPetFood?: string;

  @IsString()
  @IsOptional()
  litterBoxLocation?: string;

  @IsString()
  @IsOptional()
  locationOfPetCarrier?: string;

  @IsString()
  @IsOptional()
  anyAdditionalInfo?: string;

  @IsString()
  @IsOptional()
  careInstructions?: string;

  @IsString()
  @IsOptional()
  feedingSchedule?: string;

  @IsString()
  @IsOptional()
  exerciseRequirements?: string;
}

export class UpdatePetCareDto {
  @IsString()
  @IsOptional()
  personalityPhobiasPreferences?: string;

  @IsString()
  @IsOptional()
  typeOfFood?: string;

  @IsString()
  @IsOptional()
  dietFoodWaterInstructions?: string;

  @IsEnum(['Yes', 'No'])
  @IsOptional()
  anyHistoryOfBiting?: string;

  @IsString()
  @IsOptional()
  locationOfStoredPetFood?: string;

  @IsString()
  @IsOptional()
  litterBoxLocation?: string;

  @IsString()
  @IsOptional()
  locationOfPetCarrier?: string;

  @IsString()
  @IsOptional()
  anyAdditionalInfo?: string;

  @IsString()
  @IsOptional()
  careInstructions?: string;

  @IsString()
  @IsOptional()
  feedingSchedule?: string;

  @IsString()
  @IsOptional()
  exerciseRequirements?: string;
}
