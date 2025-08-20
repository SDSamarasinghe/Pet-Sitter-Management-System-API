import { IsString, IsOptional, IsMongoId } from 'class-validator';

export class CreatePetCareDto {
  @IsString()
  petId: string;

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
  careInstructions?: string;

  @IsString()
  @IsOptional()
  feedingSchedule?: string;

  @IsString()
  @IsOptional()
  exerciseRequirements?: string;
}
