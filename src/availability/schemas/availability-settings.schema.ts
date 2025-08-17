import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type AvailabilitySettingsDocument = AvailabilitySettings & Document;

@Schema({ _id: false })
export class WeeklySchedule {
  @Prop({ required: true })
  isAvailable: boolean;

  @Prop({ required: false })
  startTime?: string; // Format: "HH:mm"

  @Prop({ required: false })
  endTime?: string; // Format: "HH:mm"
}

const WeeklyScheduleSchema = SchemaFactory.createForClass(WeeklySchedule);

@Schema({ _id: false })
export class HolidayRates {
  @Prop({ required: true, default: false })
  enabled: boolean;

  @Prop({ required: true, default: 0 })
  percentage: number; // Additional percentage charge

  @Prop([String])
  holidays: string[]; // Array of holiday dates
}

const HolidayRatesSchema = SchemaFactory.createForClass(HolidayRates);

@Schema({ timestamps: true })
export class AvailabilitySettings {
  @Prop({ required: true, type: Types.ObjectId, ref: 'User', unique: true })
  sitterId: Types.ObjectId;

  @Prop({
    type: {
      monday: WeeklyScheduleSchema,
      tuesday: WeeklyScheduleSchema,
      wednesday: WeeklyScheduleSchema,
      thursday: WeeklyScheduleSchema,
      friday: WeeklyScheduleSchema,
      saturday: WeeklyScheduleSchema,
      sunday: WeeklyScheduleSchema,
    },
    required: true,
  })
  weeklySchedule: {
    monday: WeeklySchedule;
    tuesday: WeeklySchedule;
    wednesday: WeeklySchedule;
    thursday: WeeklySchedule;
    friday: WeeklySchedule;
    saturday: WeeklySchedule;
    sunday: WeeklySchedule;
  };

  @Prop({ required: true, default: 5 })
  maxDailyBookings: number;

  @Prop({ required: true, default: 24 })
  advanceNoticeHours: number;

  @Prop({ required: true, default: 10 })
  travelDistance: number; // in miles/km

  @Prop({ type: HolidayRatesSchema, required: true })
  holidayRates: HolidayRates;

  @Prop([String])
  unavailableDates: string[]; // Array of dates when sitter is unavailable

  @Prop({ required: true, default: true })
  isActive: boolean;
}

export const AvailabilitySettingsSchema = SchemaFactory.createForClass(AvailabilitySettings);
