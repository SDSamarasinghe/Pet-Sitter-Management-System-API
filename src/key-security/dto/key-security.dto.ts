import { IsString, IsOptional, IsArray, IsNotEmpty, IsMongoId } from 'class-validator';

export class CreateKeySecurityDto {
  @IsString()
  @IsOptional()
  lockboxCode?: string;

  @IsString()
  @IsOptional()
  lockboxLocation?: string;

  @IsString()
  @IsOptional()
  alarmCode?: string;

  @IsString()
  @IsOptional()
  alarmInstructions?: string;

  @IsString()
  @IsOptional()
  specialInstructions?: string;

  @IsString()
  @IsOptional()
  comments?: string;

  @IsArray()
  @IsOptional()
  othersWithAccess?: string[];

  @IsArray()
  @IsOptional()
  emergencyContacts?: string[];

  @IsString()
  @IsOptional()
  keyLocation?: string;

  @IsString()
  @IsOptional()
  gateCode?: string;

  @IsString()
  @IsOptional()
  wifiNetwork?: string;

  @IsString()
  @IsOptional()
  wifiPassword?: string;
}

export class UpdateKeySecurityDto extends CreateKeySecurityDto {}
