import { IsString, IsOptional, IsObject, IsNotEmpty, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

class AccessPermissionsDto {
  @IsBoolean()
  @IsOptional()
  landlord?: boolean;

  @IsBoolean()
  @IsOptional()
  buildingManagement?: boolean;

  @IsBoolean()
  @IsOptional()
  superintendent?: boolean;

  @IsBoolean()
  @IsOptional()
  housekeeper?: boolean;

  @IsBoolean()
  @IsOptional()
  neighbour?: boolean;

  @IsBoolean()
  @IsOptional()
  friend?: boolean;

  @IsBoolean()
  @IsOptional()
  family?: boolean;

  @IsBoolean()
  @IsOptional()
  none?: boolean;
}

export class CreateKeySecurityDto {
  @IsString()
  @IsNotEmpty()
  lockboxCode: string;

  @IsString()
  @IsOptional()
  lockboxLocation?: string;

  @IsString()
  @IsOptional()
  alarmCompanyName?: string;

  @IsString()
  @IsOptional()
  alarmCompanyPhone?: string;

  @IsString()
  @IsOptional()
  alarmCodeToEnter?: string;

  @IsString()
  @IsOptional()
  alarmCodeToExit?: string;

  @IsString()
  @IsOptional()
  additionalComments?: string;

  @IsObject()
  @IsOptional()
  @Type(() => AccessPermissionsDto)
  accessPermissions?: AccessPermissionsDto;

  @IsString()
  @IsOptional()
  homeAccessList?: string;
}

export class UpdateKeySecurityDto extends CreateKeySecurityDto {}
