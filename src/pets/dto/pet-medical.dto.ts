import { IsString, IsOptional, IsMongoId } from 'class-validator';

export class CreatePetMedicalDto {
  @IsString()
  petId: string;

  @IsString()
  @IsOptional()
  vetBusinessName?: string;

  @IsString()
  @IsOptional()
  vetDoctorName?: string;

  @IsString()
  @IsOptional()
  vetAddress?: string;

  @IsString()
  @IsOptional()
  vetPhoneNumber?: string;

  @IsString()
  @IsOptional()
  currentOnVaccines?: string;

  @IsString()
  @IsOptional()
  onAnyMedication?: string;

  @IsString()
  @IsOptional()
  rabiesTagNumber?: string;
}

export class UpdatePetMedicalDto {
  @IsString()
  @IsOptional()
  vetBusinessName?: string;

  @IsString()
  @IsOptional()
  vetDoctorName?: string;

  @IsString()
  @IsOptional()
  vetAddress?: string;

  @IsString()
  @IsOptional()
  vetPhoneNumber?: string;

  @IsString()
  @IsOptional()
  currentOnVaccines?: string;

  @IsString()
  @IsOptional()
  onAnyMedication?: string;

  @IsString()
  @IsOptional()
  rabiesTagNumber?: string;
}
