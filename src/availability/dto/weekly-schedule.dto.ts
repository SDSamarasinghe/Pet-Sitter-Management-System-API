import { IsBoolean, IsOptional, IsString, Matches } from 'class-validator';

export class WeeklyScheduleDto {
  @IsBoolean()
  isAvailable: boolean;

  @IsOptional()
  @IsString()
  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'Time must be in HH:mm format',
  })
  startTime?: string;

  @IsOptional()
  @IsString()
  @Matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/, {
    message: 'Time must be in HH:mm format',
  })
  endTime?: string;
}
