import { 
  IsBoolean, 
  IsDateString, 
  IsMongoId, 
  IsNumber, 
  IsOptional, 
  IsString, 
  Matches,
  Min 
} from 'class-validator';

export class CreateAvailabilitySlotDto {
  @IsDateString()
  date: string;

  @IsString()
  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'Start time must be in HH:mm format',
  })
  startTime: string;

  @IsString()
  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'End time must be in HH:mm format',
  })
  endTime: string;

  @IsBoolean()
  @IsOptional()
  isAvailable?: boolean;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  slotType?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  customRate?: number;
}

export class UpdateAvailabilitySlotDto {
  @IsDateString()
  @IsOptional()
  date?: string;

  @IsString()
  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'Start time must be in HH:mm format',
  })
  @IsOptional()
  startTime?: string;

  @IsString()
  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'End time must be in HH:mm format',
  })
  @IsOptional()
  endTime?: string;

  @IsBoolean()
  @IsOptional()
  isAvailable?: boolean;

  @IsMongoId()
  @IsOptional()
  bookingId?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  slotType?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  customRate?: number;
}

export class AvailabilityCheckDto {
  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsString()
  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'Start time must be in HH:mm format',
  })
  @IsOptional()
  startTime?: string;

  @IsString()
  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'End time must be in HH:mm format',
  })
  @IsOptional()
  endTime?: string;
}
