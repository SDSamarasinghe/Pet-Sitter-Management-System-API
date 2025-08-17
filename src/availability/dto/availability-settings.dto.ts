import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  Max,
  ValidateNested,
} from 'class-validator';
import { WeeklyScheduleDto } from './weekly-schedule.dto';

export class HolidayRatesDto {
  @IsBoolean()
  enabled: boolean;

  @IsNumber()
  @Min(0)
  @Max(100)
  percentage: number;

  @IsArray()
  @IsString({ each: true })
  holidays: string[];
}

export class WeekendRatesDto {
  @IsBoolean()
  enabled: boolean;

  @IsNumber()
  @Min(0)
  @Max(100)
  percentage: number;
}

export class WeeklyScheduleContainerDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => WeeklyScheduleDto)
  monday?: WeeklyScheduleDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => WeeklyScheduleDto)
  tuesday?: WeeklyScheduleDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => WeeklyScheduleDto)
  wednesday?: WeeklyScheduleDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => WeeklyScheduleDto)
  thursday?: WeeklyScheduleDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => WeeklyScheduleDto)
  friday?: WeeklyScheduleDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => WeeklyScheduleDto)
  saturday?: WeeklyScheduleDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => WeeklyScheduleDto)
  sunday?: WeeklyScheduleDto;
}

export class CreateAvailabilitySettingsDto {
  @ValidateNested()
  @Type(() => WeeklyScheduleContainerDto)
  weeklySchedule: WeeklyScheduleContainerDto;

  @IsNumber()
  @Min(1)
  @Max(20)
  maxDailyBookings: number;

  @IsNumber()
  @Min(1)
  @Max(168) // 1 week in hours
  advanceNoticeHours: number;

  @IsNumber()
  @Min(1)
  @Max(100)
  travelDistance: number;

  @ValidateNested()
  @Type(() => HolidayRatesDto)
  holidayRates: HolidayRatesDto;

  @ValidateNested()
  @Type(() => WeekendRatesDto)
  @IsOptional()
  weekendRates?: WeekendRatesDto;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  unavailableDates?: string[];

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateAvailabilitySettingsDto {
  @ValidateNested()
  @Type(() => WeeklyScheduleContainerDto)
  @IsOptional()
  weeklySchedule?: WeeklyScheduleContainerDto;

  @IsNumber()
  @Min(1)
  @Max(20)
  @IsOptional()
  maxDailyBookings?: number;

  @IsNumber()
  @Min(1)
  @Max(168)
  @IsOptional()
  advanceNoticeHours?: number;

  @IsNumber()
  @Min(1)
  @Max(100)
  @IsOptional()
  travelDistance?: number;

  @ValidateNested()
  @Type(() => HolidayRatesDto)
  @IsOptional()
  holidayRates?: HolidayRatesDto;

  @ValidateNested()
  @Type(() => WeekendRatesDto)
  @IsOptional()
  weekendRates?: WeekendRatesDto;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  unavailableDates?: string[];

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
