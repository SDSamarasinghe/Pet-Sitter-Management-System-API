import { IsBoolean, IsOptional, IsString, MaxLength, Matches } from 'class-validator';

/**
 * A single requested visit within a booking request.
 *
 * A booking request can contain several visits on the same calendar day
 * (e.g. a morning and an evening visit), so each visit carries its own
 * date and clock times rather than inheriting one window for the whole range.
 * Times are wall-clock times in the request's `timeZone`.
 */
export class BookingVisitDto {
  @Matches(/^\d{4}-\d{2}-\d{2}$/, {
    message: 'visit date must be in YYYY-MM-DD format',
  })
  date: string;

  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'visit startTime must be in HH:mm (24-hour) format',
  })
  startTime: string;

  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'visit endTime must be in HH:mm (24-hour) format',
  })
  endTime: string;

  // Set for a visit that runs past midnight (e.g. an overnight stay 22:00-07:00),
  // where endTime lands on the day after `date`.
  @IsBoolean()
  @IsOptional()
  endsNextDay?: boolean;

  // Optional human label shown to the sitter and in emails, e.g. 'Morning'
  @IsString()
  @IsOptional()
  @MaxLength(40)
  label?: string;
}
