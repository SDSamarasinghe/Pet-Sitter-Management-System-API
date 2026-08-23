import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { randomUUID } from 'crypto';
import {
  PaginationQuery,
  PaginatedResult,
  parsePagination,
  buildPaginatedResult,
  escapeRegex,
} from '../common/pagination';

// Surcharge percentages applied per-day at booking creation time.
// Kept in sync with the booking form on the web client.
const WEEKEND_SURCHARGE_PCT = 15;
const HOLIDAY_SURCHARGE_PCT = 25;
const HOLIDAY_MONTH_DAYS = new Set(['01-01', '07-01', '12-25', '12-26']);

// Statuses that still hold time in the calendar and can therefore clash.
const ACTIVE_BOOKING_STATUSES = ['pending', 'confirmed', 'assigned', 'in_progress'];

// What a non-admin may change on a booking. Everything else — the sitter,
// the price, the dates, admin notes — is admin-only.
const SITTER_UPDATABLE_FIELDS = ['status'];
const CLIENT_UPDATABLE_FIELDS = ['status', 'clientNotes'];

// Statuses each non-admin role may move a booking to.
const SITTER_SETTABLE_STATUSES = ['in_progress', 'completed'];
const CLIENT_SETTABLE_STATUSES = ['cancelled'];

/** The id of a field that may or may not have been populated. */
function idOf(value: any): string | undefined {
  if (!value) return undefined;
  return (value._id ?? value).toString();
}

// Visits are stored as instants but always quoted to people in business time.
const DEFAULT_BUSINESS_TIMEZONE = 'America/Toronto';

// One requested visit, resolved from wall-clock times to absolute instants.
type VisitWindow = { start: Date; end: Date; label?: string };

/**
 * Normalize a date the client sent into a business-local YYYY-MM-DD key.
 * Accepts a bare date (used as-is) or a full ISO instant (resolved in `timeZone`).
 */
function asDayKey(value: string, timeZone: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new BadRequestException(`Invalid date: ${value}`);
  }
  return businessDayKey(parsed, timeZone);
}

/** The calendar day an instant falls on in business time, as YYYY-MM-DD. */
function businessDayKey(date: Date, timeZone: string): string {
  return formatInTimeZone(date, timeZone, 'yyyy-MM-dd');
}

/** Day of week for a YYYY-MM-DD key, 0 = Sunday. */
function dayOfWeekForKey(dayKey: string): number {
  const [year, month, day] = dayKey.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

function addCalendarDays(dayKey: string, days: number): string {
  const [year, month, day] = dayKey.split('-').map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day));
  shifted.setUTCDate(shifted.getUTCDate() + days);
  return shifted.toISOString().slice(0, 10);
}

function calendarDaysBetween(fromDayKey: string, toDayKey: string): number {
  const asUtc = (key: string) => {
    const [year, month, day] = key.split('-').map(Number);
    return Date.UTC(year, month - 1, day);
  };
  return Math.round((asUtc(toDayKey) - asUtc(fromDayKey)) / (1000 * 60 * 60 * 24));
}

/**
 * Categorize a visit by the calendar day it falls on in business time.
 * The instant alone is not enough: a Friday 9pm Toronto visit is Saturday in UTC,
 * and would otherwise pick up a weekend surcharge it should not have.
 */
function dayCategory(
  date: Date,
  timeZone: string = DEFAULT_BUSINESS_TIMEZONE,
): 'holiday' | 'weekend' | 'weekday' {
  const dayKey = businessDayKey(date, timeZone);
  if (HOLIDAY_MONTH_DAYS.has(dayKey.slice(5))) return 'holiday';
  const dow = dayOfWeekForKey(dayKey);
  if (dow === 0 || dow === 6) return 'weekend';
  return 'weekday';
}

/**
 * Two visits clash only when they genuinely share time. The comparison is
 * half-open, so back-to-back visits (09:00-09:30 then 09:30-10:00) and a
 * morning/evening pair on the same day are not treated as a clash.
 */
function windowsOverlap(
  a: { start: Date; end: Date },
  b: { start: Date; end: Date },
): boolean {
  return a.start.getTime() < b.end.getTime() && a.end.getTime() > b.start.getTime();
}

/** Human-readable visit window for error messages, e.g. 'Aug 15, 6:00 PM-6:30 PM'. */
function describeWindow(window: { start: Date; end: Date }, timeZone: string): string {
  const sameDay =
    businessDayKey(window.start, timeZone) === businessDayKey(window.end, timeZone);
  const start = formatInTimeZone(window.start, timeZone, 'MMM d, h:mm a');
  const end = formatInTimeZone(window.end, timeZone, sameDay ? 'h:mm a' : 'MMM d, h:mm a');
  return `${start}-${end}`;
}

function applySurcharge(baseAmount: number, category: 'holiday' | 'weekend' | 'weekday'): number {
  if (category === 'holiday') {
    return Math.round(baseAmount * (1 + HOLIDAY_SURCHARGE_PCT / 100));
  }
  if (category === 'weekend') {
    return Math.round(baseAmount * (1 + WEEKEND_SURCHARGE_PCT / 100));
  }
  return baseAmount;
}
import { Booking, BookingDocument } from './schemas/booking.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { CreateBookingDto } from './dto/create-booking.dto';
import { BookingVisitDto } from './dto/booking-visit.dto';
import { CheckSitterAvailabilityDto } from './dto/check-sitter-availability.dto';
import { CreateBookingAdminDto } from './dto/create-booking-admin.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { ServiceInquiryDto } from './dto/service-inquiry.dto';
import { EmailService } from '../email/email.service';
import { ActivityLogService } from '../activity-log/activity-log.service';
import { toDate, formatInTimeZone } from 'date-fns-tz';

@Injectable()
export class BookingsService {
  constructor(
    @InjectModel(Booking.name) private bookingModel: Model<BookingDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private emailService: EmailService,
    private activityLogService: ActivityLogService,
  ) {}

  async deleteByAdmin(bookingId: string, adminUserId: string): Promise<void> {
    const booking = await this.bookingModel.findById(bookingId).exec();
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }
    await this.bookingModel.findByIdAndDelete(bookingId).exec();

    try {
      await this.activityLogService.log(
        adminUserId,
        'Booking deleted by admin',
        'booking',
        `Admin deleted booking ${bookingId}`,
        { deletedForUserId: booking.userId?.toString() },
        bookingId,
        'booking',
      );
    } catch (error) {
      console.error('Failed to write admin booking delete activity log:', (error as Error)?.message || error);
    }
  }

  /**
   * Send notifications for pending bookings (Step 1)
   */
  private async sendPendingBookingNotifications(booking: any, rangeStartDate?: Date, rangeEndDate?: Date): Promise<void> {
    try {
      const client = booking.userId;
      await this.emailService.sendPendingBookingEmails(booking, client, rangeStartDate, rangeEndDate);
      console.log(`Pending booking email notifications sent for booking ${booking._id}`);
    } catch (error) {
      console.error('Error sending pending booking notifications:', error);
    }
  }

  /**
   * Send email notification when sitter is assigned to existing booking
   */
  private async sendSitterAssignmentNotification(booking: BookingDocument, rangeStartDate?: Date, rangeEndDate?: Date): Promise<void> {
    try {
      // Get client and sitter information
      const client = await this.userModel.findById(booking.userId).exec();
      const sitter = await this.userModel.findById(booking.sitterId).exec();
      
      if (!client || !sitter) {
        console.log('Cannot send assignment email - client or sitter not found');
        return;
      }

      // Send email notification to the assigned sitter
      await this.emailService.sendSitterAssignmentEmail(booking, client, sitter, rangeStartDate, rangeEndDate);

      console.log(`✅ Sitter assignment notification sent for booking ${booking._id}`);
    } catch (error) {
      console.error('Failed to send sitter assignment notification:', error);
      // Don't throw error - email failure shouldn't break booking assignment
    }
  }

  /**
   * Send service inquiry notification emails (CLIENT + ADMIN)
   */
  private async sendServiceInquiryNotifications(booking: any, rangeStartDate?: Date, rangeEndDate?: Date): Promise<void> {
    try {
      const client = booking.userId;
      await this.emailService.sendServiceInquiryEmails(booking, client, rangeStartDate, rangeEndDate);
      console.log(`Service inquiry notification emails sent for inquiry ${booking._id}`);
    } catch (error) {
      console.error('Error sending service inquiry notifications:', error);
    }
  }

  /**
   * Submit service inquiry (public endpoint)
   */
  async submitServiceInquiry(serviceInquiryDto: ServiceInquiryDto): Promise<any> {
    // Check if user already exists by email
    let user = await this.userModel.findOne({ email: serviceInquiryDto.email });
    
    if (serviceInquiryDto.customerType === 'existing') {
      // Existing customer - user MUST exist
      if (!user) {
        throw new BadRequestException('No account found with this email. Please select "I am a new customer" or use the email associated with your account.');
      }
      
      // Update user information if provided (in case they changed phone/address)
      if (serviceInquiryDto.phoneNumber) user.phoneNumber = serviceInquiryDto.phoneNumber;
      if (serviceInquiryDto.address) user.address = serviceInquiryDto.address;
      await user.save();
      
      console.log(`📋 Service inquiry from EXISTING customer: ${user.email}`);
    } else {
      // New customer
      if (user) {
        throw new BadRequestException('An account with this email already exists. Please select "I am an existing customer" or use a different email address.');
      }
      
      // Create new user for service inquiry
      user = new this.userModel({
        email: serviceInquiryDto.email,
        firstName: serviceInquiryDto.firstName,
        lastName: serviceInquiryDto.lastName,
        phoneNumber: serviceInquiryDto.phoneNumber,
        address: serviceInquiryDto.address,
        customerType: serviceInquiryDto.customerType,
        role: 'client',
        password: 'temp_password_' + Date.now(), // Temporary password - admin will handle
        emergencyContact: serviceInquiryDto.phoneNumber, // Default to phone number
        homeCareInfo: serviceInquiryDto.additionalDetails || 'Service inquiry submitted',
      });
      await user.save();
      
      console.log(`📋 Service inquiry from NEW customer: ${user.email}`);
    }

    // The inquiry form sends dates as YYYY-MM-DD, meant as business-local days.
    // Use the same timezone the visit times below are built in, so a supplied
    // timeZone does not end up applied to the times but not the dates.
    const inquiryTimezone = serviceInquiryDto.timeZone || DEFAULT_BUSINESS_TIMEZONE;
    const startDayKey = asDayKey(serviceInquiryDto.startDate, inquiryTimezone);
    const endDayKey = asDayKey(serviceInquiryDto.endDate, inquiryTimezone);
    const startDate = toDate(`${startDayKey}T00:00:00`, { timeZone: inquiryTimezone });
    const endDate = toDate(`${endDayKey}T00:00:00`, { timeZone: inquiryTimezone });
    
    console.log(`🔍 [DEBUG] Received dates:`, {
      startDateString: serviceInquiryDto.startDate,
      endDateString: serviceInquiryDto.endDate,
      startDateParsed: startDate.toISOString(),
      endDateParsed: endDate.toISOString(),
      startTime: startDate.getTime(),
      endTime: endDate.getTime(),
      timeDiff: endDate.getTime() - startDate.getTime(),
    });
    
    // Count calendar days, not elapsed 24h blocks: a range spanning the spring
    // clock change is only 47 hours long and would otherwise lose a day.
    const daysDiff = calendarDaysBetween(startDayKey, endDayKey) + 1;
    if (daysDiff < 1) {
      throw new BadRequestException('End date must not be before the start date');
    }
    
    console.log(`📅 Creating ${daysDiff} individual bookings from ${startDate.toDateString()} to ${endDate.toDateString()}`);
    
    // === Time Parsing ===
    // Accept formats: HH:mm (24h), H:mm AM/PM, H AM/PM, HH (24h)
    const parseTimeToMinutes = (value?: string, fallbackMinutes?: number): number => {
      if (!value || !value.trim()) return fallbackMinutes ?? 9 * 60; // default 09:00
      const raw = value.trim();
      const ampmMatch = raw.match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)$/i);
      if (ampmMatch) {
        let hour = parseInt(ampmMatch[1], 10);
        const minute = parseInt(ampmMatch[2] ?? '0', 10);
        const suffix = ampmMatch[3].toUpperCase();
        if (suffix === 'PM' && hour < 12) hour += 12;
        if (suffix === 'AM' && hour === 12) hour = 0;
        return hour * 60 + minute;
      }
      const hmMatch = raw.match(/^(\d{1,2}):(\d{2})$/);
      if (hmMatch) {
        const hour = parseInt(hmMatch[1], 10);
        const minute = parseInt(hmMatch[2], 10);
        if (hour >= 0 && hour < 24 && minute >= 0 && minute < 60) return hour * 60 + minute;
      }
      const hOnlyMatch = raw.match(/^(\d{1,2})$/);
      if (hOnlyMatch) {
        const hour = parseInt(hOnlyMatch[1], 10);
        if (hour >= 0 && hour < 24) return hour * 60;
      }
      console.warn(`⚠️ Unrecognized time format '${value}', using fallback.`);
      return fallbackMinutes ?? 9 * 60;
    };

    const startMinutes = parseTimeToMinutes(serviceInquiryDto.startTime, 9 * 60); // default 09:00
    const endMinutes = parseTimeToMinutes(serviceInquiryDto.endTime, 17 * 60); // default 17:00
    let adjustedEndMinutes = endMinutes;
    if (endMinutes <= startMinutes) {
      // Prevent zero/negative duration; enforce +1 hour minimum
      adjustedEndMinutes = startMinutes + 60;
    }

    // Calculate estimated cost per day (CAD 46 per pet per day)
    const baseRatePerPet = 46; // CAD 46 per pet per day
    const costPerDay = baseRatePerPet * serviceInquiryDto.numberOfPets;
    const totalEstimatedCost = costPerDay * daysDiff;
    console.log(`💰 Cost calculation: baseRate=$${baseRatePerPet}/pet, numberOfPets=${serviceInquiryDto.numberOfPets}, costPerDay=$${costPerDay}`);
    console.log(`⏱ Parsed times -> startMinutes=${startMinutes}, endMinutes=${endMinutes}, adjustedEndMinutes=${adjustedEndMinutes}`);
    
    const bookingIds = [];
    const bookingGroupId = daysDiff > 1 ? randomUUID() : undefined;

    // Create a separate booking for each day in the range applying parsed times
    // Use business timezone so all users see consistent clock times
    const businessTimezone = inquiryTimezone;

    for (let i = 0; i < daysDiff; i++) {
      // Step by calendar date rather than by 24h, which drifts across a clock change.
      const dateStr = addCalendarDays(startDayKey, i); // YYYY-MM-DD
      const dayDate = toDate(`${dateStr}T00:00:00`, { timeZone: businessTimezone });
      
      // Build local time strings and convert to UTC using business timezone
      const startTimeStr = `${Math.floor(startMinutes / 60).toString().padStart(2, '0')}:${(startMinutes % 60).toString().padStart(2, '0')}`;
      const endTimeStr = `${Math.floor(adjustedEndMinutes / 60).toString().padStart(2, '0')}:${(adjustedEndMinutes % 60).toString().padStart(2, '0')}`;
      
      // Convert from business timezone to UTC
      const startDateTime = toDate(`${dateStr}T${startTimeStr}:00`, { timeZone: businessTimezone });
      const endDateTime = toDate(`${dateStr}T${endTimeStr}:00`, { timeZone: businessTimezone });
      
      console.log(`🔍 [DEBUG] Creating booking ${i + 1}/${daysDiff}:`, {
        startDateTime: startDateTime.toISOString(),
        endDateTime: endDateTime.toISOString(),
        durationHours: (endDateTime.getTime() - startDateTime.getTime()) / (1000 * 60 * 60),
        costPerDay,
      });
      
      // Extract clean service type (e.g., "Pet Sitting" from "Pet Sitting 1hr Holiday")
      let cleanServiceType = 'Service Inquiry';
      if (serviceInquiryDto.service) {
        // Extract just the main service type (before any numbers/duration)
        cleanServiceType = serviceInquiryDto.service.split(/\d/)[0].trim();
        if (!cleanServiceType) cleanServiceType = serviceInquiryDto.service;
      }
      
      const booking = new this.bookingModel({
        userId: user._id,
        createdBy: user._id, // Service inquiry is created by the client themselves
        bookingGroupId,
        startDate: startDateTime,
        endDate: endDateTime,
        serviceType: cleanServiceType,
        numberOfPets: serviceInquiryDto.numberOfPets,
        petTypes: serviceInquiryDto.petTypes,
        status: 'pending',
        notes: serviceInquiryDto.additionalDetails || '',
        adminNotes: `Service: ${serviceInquiryDto.service || 'Not specified'} | Customer: ${serviceInquiryDto.customerType} | Day ${i + 1}/${daysDiff} | Time: ${serviceInquiryDto.startTime || '09:00'} - ${serviceInquiryDto.endTime || '17:00'}`,
        totalAmount: costPerDay,
        paymentStatus: 'pending',
        serviceAddress: serviceInquiryDto.address,
        specialInstructions: serviceInquiryDto.additionalDetails,
      });

      await booking.save();
      bookingIds.push(booking._id);
      console.log(`✅ Created booking ${i + 1}/${daysDiff} with ID: ${booking._id} for ${dayDate.toDateString()} (${serviceInquiryDto.startTime || '09:00'}-${serviceInquiryDto.endTime || '17:00'}) Cost: $${costPerDay}`);
    }
    
    console.log(`✅ Successfully created ${bookingIds.length} bookings:`, bookingIds.map(id => id.toString()));

    try {
      await this.activityLogService.log(
        user._id.toString(),
        'Service inquiry submitted',
        'booking',
        `Created ${bookingIds.length} service inquiry booking(s)`,
        {
          customerType: serviceInquiryDto.customerType,
          numberOfPets: serviceInquiryDto.numberOfPets,
          bookingCount: bookingIds.length,
          totalEstimatedCost,
        },
        bookingIds[0]?.toString(),
        'booking',
      );
    } catch (error) {
      console.error('Failed to write service inquiry activity log:', (error as Error)?.message || error);
    }

    // Get the first booking for email notification (with populated user details)
    const firstBooking = await this.bookingModel
      .findById(bookingIds[0])
      .populate('userId', 'firstName lastName email phoneNumber address emergencyContact')
      .exec();

    // Send SERVICE INQUIRY email notifications (separate from booking emails)
    if (firstBooking) {
      console.log(`📧 Sending service inquiry notification emails...`);
      await this.sendServiceInquiryNotifications(firstBooking, startDate, endDate);
    }

    return {
      message: 'Service inquiry submitted successfully. We will contact you soon!',
      bookingIds,
      customerType: serviceInquiryDto.customerType,
      totalDays: daysDiff,
      estimatedCostPerDay: costPerDay,
      totalEstimatedCost,
      isExistingCustomer: serviceInquiryDto.customerType === 'existing',
    };
  }

  /**
   * Create a new booking (Step 1: Pending status + emails)
   * Creates one booking record per requested visit. A day can hold more than
   * one visit (e.g. a morning and an evening visit), so the records are linked
   * by a shared bookingGroupId rather than being one-per-calendar-day.
   */
  async create(createBookingDto: CreateBookingDto, userId: string): Promise<Booking> {
    const { visitSlots: _visitSlots, timeZone: _timeZone, ...bookingFields } = createBookingDto;
    const { windows, timeZone } = this.buildVisitWindows(createBookingDto);

    const sitterId = createBookingDto.sitterId?.trim() || undefined;

    // Reject only visits that genuinely overlap an existing one, for this
    // client or the requested sitter — not every booking sharing a date.
    await this.assertNoVisitConflicts(windows, { userId, sitterId }, timeZone);

    const startDate = windows[0].start;
    const endDate = windows[windows.length - 1].end;
    const bookingGroupId = windows.length > 1 ? randomUUID() : undefined;
    // The incoming totalAmount is the weekday rate for a single visit (rate × pets);
    // each visit's record gets a surcharge based on its own date category.
    const basePerVisit = createBookingDto.totalAmount;

    const bookingsToCreate = windows.map((window) => new this.bookingModel({
      ...bookingFields,
      userId: new Types.ObjectId(userId),
      createdBy: new Types.ObjectId(userId),
      bookingGroupId,
      sitterId: sitterId ? new Types.ObjectId(sitterId) : undefined,
      startDate: window.start,
      endDate: window.end,
      visitLabel: window.label,
      totalAmount: applySurcharge(basePerVisit, dayCategory(window.start, timeZone)),
      status: 'pending',
      paymentStatus: 'pending',
    }));

    // Save all bookings
    const savedBookings = await this.bookingModel.insertMany(bookingsToCreate);

    // Send email notification for the first booking (to avoid spam)
    if (savedBookings.length > 0) {
      const populatedBooking = await this.bookingModel
        .findById(savedBookings[0]._id)
        .populate('userId', 'firstName lastName email phoneNumber address emergencyContact')
        .populate('sitterId', 'firstName lastName email')
        .exec();

      if (populatedBooking) {
        // Pass the original date range for multi-day bookings
        await this.sendPendingBookingNotifications(populatedBooking, startDate, endDate);

        // If sitter is already assigned, send sitter assignment notification
        if (populatedBooking.sitterId) {
          await this.sendSitterAssignmentNotification(populatedBooking, startDate, endDate);
        }
      }
    }

    // Return the first booking as reference
    try {
      await this.activityLogService.log(
        userId,
        'Booking created',
        'booking',
        `Created ${savedBookings.length} visit(s)`,
        {
          serviceType: createBookingDto.serviceType,
          bookingCount: savedBookings.length,
        },
        savedBookings[0]?._id?.toString(),
        'booking',
      );
    } catch (error) {
      console.error('Failed to write create booking activity log:', (error as Error)?.message || error);
    }

    return savedBookings[0] as any;
  }

  /**
   * Create a new booking by admin on behalf of client
   * Creates individual booking records for each day in the date range
   */
  async createByAdmin(
    createBookingAdminDto: CreateBookingAdminDto, 
    adminUserId: string
  ): Promise<Booking> {
    const {
      visitSlots: _visitSlots,
      timeZone: _timeZone,
      ...bookingFields
    } = createBookingAdminDto;
    const { windows, timeZone } = this.buildVisitWindows(createBookingAdminDto);

    // Verify the client exists
    const client = await this.userModel.findById(createBookingAdminDto.userId);
    if (!client) {
      throw new NotFoundException('Client not found');
    }

    const sitterId = createBookingAdminDto.sitterId?.trim() || undefined;

    await this.assertNoVisitConflicts(
      windows,
      { userId: createBookingAdminDto.userId, sitterId },
      timeZone,
    );

    const startDate = windows[0].start;
    const endDate = windows[windows.length - 1].end;
    const bookingGroupId = windows.length > 1 ? randomUUID() : undefined;
    const basePerVisit = createBookingAdminDto.totalAmount;

    const bookingsToCreate = windows.map((window) => new this.bookingModel({
      ...bookingFields,
      userId: new Types.ObjectId(createBookingAdminDto.userId),
      createdBy: new Types.ObjectId(adminUserId),
      bookingGroupId,
      sitterId: sitterId ? new Types.ObjectId(sitterId) : undefined,
      startDate: window.start,
      endDate: window.end,
      visitLabel: window.label,
      totalAmount: applySurcharge(basePerVisit, dayCategory(window.start, timeZone)),
      status: 'pending',
      paymentStatus: 'pending',
    }));

    // Save all bookings
    const savedBookings = await this.bookingModel.insertMany(bookingsToCreate);
    
    // Send email notification for the first booking (to avoid spam)
    if (savedBookings.length > 0) {
      const populatedBooking = await this.bookingModel
        .findById(savedBookings[0]._id)
        .populate('userId', 'firstName lastName email phoneNumber address emergencyContact')
        .populate('sitterId', 'firstName lastName email')
        .exec();

      if (populatedBooking) {
        // Pass the original date range for multi-day bookings
        await this.sendPendingBookingNotifications(populatedBooking, startDate, endDate);
        
        // If sitter is already assigned, send sitter assignment notification
        if (populatedBooking.sitterId) {
          await this.sendSitterAssignmentNotification(populatedBooking, startDate, endDate);
        }
      }
    }
    
    // Return the first booking as reference
    try {
      await this.activityLogService.log(
        adminUserId,
        'Booking created by admin',
        'booking',
        `Admin created ${savedBookings.length} visit(s) for client ${createBookingAdminDto.userId}`,
        {
          serviceType: createBookingAdminDto.serviceType,
          clientId: createBookingAdminDto.userId,
          bookingCount: savedBookings.length,
        },
        savedBookings[0]?._id?.toString(),
        'booking',
      );
    } catch (error) {
      console.error('Failed to write admin booking activity log:', (error as Error)?.message || error);
    }

    return savedBookings[0] as any;
  }

  /**
   * Resolve a booking request into the list of visits it actually asks for.
   *
   * `visitSlots` is authoritative when supplied and may contain several visits
   * on the same calendar day — a morning and an evening visit, say. Requests
   * that predate visit slots fall back to one visit per calendar day, keeping
   * the requested clock times rather than blocking out the whole day.
   */
  private buildVisitWindows(dto: {
    startDate?: string;
    endDate?: string;
    visitSlots?: BookingVisitDto[];
    timeZone?: string;
  }): { windows: VisitWindow[]; timeZone: string } {
    const timeZone = dto.timeZone?.trim() || DEFAULT_BUSINESS_TIMEZONE;
    const windows = dto.visitSlots?.length
      ? this.windowsFromSlots(dto.visitSlots, timeZone)
      : this.windowsFromRange(dto.startDate, dto.endDate, timeZone);

    if (windows.length === 0) {
      throw new BadRequestException('A booking must contain at least one visit');
    }

    windows.sort((a, b) => a.start.getTime() - b.start.getTime());

    // A request must not clash with itself.
    for (let i = 1; i < windows.length; i++) {
      if (windowsOverlap(windows[i - 1], windows[i])) {
        throw new BadRequestException(
          `Two visits in this request overlap (${describeWindow(windows[i - 1], timeZone)} ` +
            `and ${describeWindow(windows[i], timeZone)}). Adjust the times so they do not clash.`,
        );
      }
    }

    return { windows, timeZone };
  }

  private windowsFromSlots(slots: BookingVisitDto[], timeZone: string): VisitWindow[] {
    return slots.map((slot) => {
      // An overnight visit ends on the morning after the date it starts on.
      const endDayKey = slot.endsNextDay ? addCalendarDays(slot.date, 1) : slot.date;
      const start = toDate(`${slot.date}T${slot.startTime}:00`, { timeZone });
      const end = toDate(`${endDayKey}T${slot.endTime}:00`, { timeZone });

      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
        throw new BadRequestException(`The visit on ${slot.date} has an invalid date or time`);
      }
      if (end.getTime() <= start.getTime()) {
        throw new BadRequestException(
          `The visit on ${slot.date} ends at or before it starts ` +
            `(${slot.startTime}-${slot.endTime}). ` +
            'Mark it as ending the next day if it runs past midnight.',
        );
      }

      return { start, end, label: slot.label?.trim() || undefined };
    });
  }

  /**
   * Expand a plain start/end range into one visit per calendar day, preserving
   * the requested clock times. A multi-day range whose end time is at or before
   * its start time reads as an overnight pattern and yields one visit per night.
   */
  private windowsFromRange(
    startDate: string | undefined,
    endDate: string | undefined,
    timeZone: string,
  ): VisitWindow[] {
    if (!startDate || !endDate) {
      throw new BadRequestException('A booking needs either a date range or a list of visits');
    }

    const rangeStart = new Date(startDate);
    const rangeEnd = new Date(endDate);
    if (Number.isNaN(rangeStart.getTime()) || Number.isNaN(rangeEnd.getTime())) {
      throw new BadRequestException('Invalid booking start or end date');
    }

    const firstDay = businessDayKey(rangeStart, timeZone);
    const lastDay = businessDayKey(rangeEnd, timeZone);
    const spanDays = calendarDaysBetween(firstDay, lastDay);
    if (spanDays < 0) {
      throw new BadRequestException('Booking end date must not be before the start date');
    }

    const startClock = formatInTimeZone(rangeStart, timeZone, 'HH:mm');
    const endClock = formatInTimeZone(rangeEnd, timeZone, 'HH:mm');
    const overnight = spanDays > 0 && endClock <= startClock;

    // An overnight range covers the nights between the two dates, so the final
    // calendar day is the morning the last visit ends on, not a visit of its own.
    const visitCount = overnight ? spanDays : spanDays + 1;
    const windows: VisitWindow[] = [];

    for (let i = 0; i < visitCount; i++) {
      const dayKey = addCalendarDays(firstDay, i);
      const start = toDate(`${dayKey}T${startClock}:00`, { timeZone });
      const endDayKey = overnight ? addCalendarDays(dayKey, 1) : dayKey;
      let end = toDate(`${endDayKey}T${endClock}:00`, { timeZone });

      if (end.getTime() <= start.getTime()) {
        // Single-day range with a non-increasing window: keep a sane, non-zero
        // duration instead of blocking out the rest of the day.
        end = new Date(start.getTime() + 60 * 60 * 1000);
      }

      windows.push({ start, end });
    }

    return windows;
  }

  /**
   * Find existing visits that genuinely clash with the requested ones.
   *
   * Deliberately scoped: a clash is either this client already having a visit
   * at that time, or the requested sitter already being busy then. Bookings
   * belonging to unrelated clients are never considered, and never read.
   */
  private async findVisitConflicts(
    windows: VisitWindow[],
    scope: { userId?: string; sitterId?: string; excludeBookingIds?: string[] },
  ): Promise<{ clientConflicts: BookingDocument[]; sitterConflicts: BookingDocument[] }> {
    const empty = { clientConflicts: [], sitterConflicts: [] };
    if (windows.length === 0) return empty;

    const userId = scope.userId?.trim() || undefined;
    const sitterId = scope.sitterId?.trim() || undefined;

    const scopeClauses: any[] = [];
    if (userId) scopeClauses.push({ userId: new Types.ObjectId(userId) });
    if (sitterId) scopeClauses.push({ sitterId: new Types.ObjectId(sitterId) });
    if (scopeClauses.length === 0) return empty;

    const rangeStart = new Date(Math.min(...windows.map((w) => w.start.getTime())));
    const rangeEnd = new Date(Math.max(...windows.map((w) => w.end.getTime())));

    const query: any = {
      status: { $in: ACTIVE_BOOKING_STATUSES },
      // Half-open range prefilter; the exact per-visit test runs below.
      startDate: { $lt: rangeEnd },
      endDate: { $gt: rangeStart },
      $or: scopeClauses,
    };
    if (scope.excludeBookingIds?.length) {
      query._id = { $nin: scope.excludeBookingIds.map((id) => new Types.ObjectId(id)) };
    }

    const candidates = await this.bookingModel.find(query).exec();
    const clashing = candidates.filter((existing) =>
      windows.some((window) =>
        windowsOverlap(window, {
          start: new Date(existing.startDate),
          end: new Date(existing.endDate),
        }),
      ),
    );

    return {
      clientConflicts: userId
        ? clashing.filter((b) => b.userId?.toString() === userId)
        : [],
      sitterConflicts: sitterId
        ? clashing.filter(
            (b) => b.sitterId?.toString() === sitterId && b.userId?.toString() !== userId,
          )
        : [],
    };
  }

  /**
   * Reject a request only when a requested visit really overlaps an existing one.
   */
  private async assertNoVisitConflicts(
    windows: VisitWindow[],
    scope: { userId?: string; sitterId?: string; excludeBookingIds?: string[] },
    timeZone: string,
  ): Promise<void> {
    const { clientConflicts, sitterConflicts } = await this.findVisitConflicts(windows, scope);

    const summarize = (bookings: BookingDocument[]) =>
      bookings
        .slice(0, 3)
        .map((b) =>
          describeWindow({ start: new Date(b.startDate), end: new Date(b.endDate) }, timeZone),
        )
        .join('; ');

    if (clientConflicts.length > 0) {
      throw new BadRequestException(
        `You already have a visit booked at this time (${summarize(clientConflicts)}). ` +
          'Several visits on the same day are fine as long as their times do not overlap.',
      );
    }

    if (sitterConflicts.length > 0) {
      // Deliberately does not identify the other client.
      throw new BadRequestException(
        `The selected sitter is already booked at this time (${summarize(sitterConflicts)}). ` +
          'Please choose a different time or leave the sitter unassigned.',
      );
    }
  }

  /**
   * Visits for a sitter that overlap the given window. Used to work out sitter
   * availability, so a sitter id is required — this never returns a whole-database
   * listing of bookings.
   */
  async checkAvailability(
    startDate: Date,
    endDate: Date,
    sitterId?: string
  ): Promise<BookingDocument[]> {
    if (!sitterId || sitterId.trim() === '') {
      throw new BadRequestException('A sitter must be specified to check availability');
    }
    if (Number.isNaN(startDate?.getTime()) || Number.isNaN(endDate?.getTime())) {
      throw new BadRequestException('Invalid start or end date');
    }

    return this.bookingModel
      .find({
        status: { $in: ACTIVE_BOOKING_STATUSES },
        sitterId: new Types.ObjectId(sitterId.trim()),
        // Half-open, so a visit ending exactly when this window opens is free.
        startDate: { $lt: endDate },
        endDate: { $gt: startDate },
      })
      .select('startDate endDate status serviceType sitterId visitLabel')
      .populate('sitterId', 'firstName lastName')
      .exec();
  }

  /**
   * Sitters free for every one of the given visits.
   *
   * Matching happens per visit rather than across the whole range, so a sitter
   * with a 9am booking is still offered for a 6pm visit on the same day.
   */
  async getAvailableSittersForVisits(
    dto: CheckSitterAvailabilityDto,
  ): Promise<UserDocument[]> {
    const { windows } = this.buildVisitWindows(dto);

    const sitters = await this.userModel
      .find({ role: 'sitter', status: 'active' })
      .exec();
    if (sitters.length === 0) return [];

    const rangeStart = new Date(Math.min(...windows.map((w) => w.start.getTime())));
    const rangeEnd = new Date(Math.max(...windows.map((w) => w.end.getTime())));

    // One query for every sitter's commitments in the range, matched precisely below.
    const commitments = await this.bookingModel
      .find({
        status: { $in: ACTIVE_BOOKING_STATUSES },
        sitterId: { $in: sitters.map((sitter) => sitter._id) },
        startDate: { $lt: rangeEnd },
        endDate: { $gt: rangeStart },
      })
      .select('sitterId startDate endDate')
      .exec();

    const busyBySitter = new Map<string, { start: Date; end: Date }[]>();
    for (const booking of commitments) {
      const key = idOf(booking.sitterId);
      if (!key) continue;
      const busy = busyBySitter.get(key) ?? [];
      busy.push({ start: new Date(booking.startDate), end: new Date(booking.endDate) });
      busyBySitter.set(key, busy);
    }

    return sitters.filter((sitter) => {
      const busy = busyBySitter.get(sitter._id.toString()) ?? [];
      if (busy.some((slot) => windows.some((window) => windowsOverlap(window, slot)))) {
        return false;
      }
      if (!dto.petTypes?.length) return true;
      return dto.petTypes.every(
        (petType) =>
          sitter.petTypesServiced?.includes(petType) ||
          sitter.petTypesServiced?.length === 0,
      );
    });
  }

  /**
   * Get available sitters for dates
   */
  async getAvailableSitters(
    startDate: string,
    endDate: string,
    serviceType?: string,
    petTypes?: string[]
  ): Promise<UserDocument[]> {
    // Get all active sitters
    const allSitters = await this.userModel.find({
      role: 'sitter',
      status: 'active'
    });

    // Widen a date-only range to cover the whole days requested, so a plain
    // 'YYYY-MM-DD' does not collapse into a zero-length window that matches nothing.
    const timeZone = DEFAULT_BUSINESS_TIMEZONE;
    const windowStart = /^\d{4}-\d{2}-\d{2}$/.test(startDate)
      ? toDate(`${startDate}T00:00:00`, { timeZone })
      : new Date(startDate);
    const windowEnd = /^\d{4}-\d{2}-\d{2}$/.test(endDate)
      ? toDate(`${addCalendarDays(endDate, 1)}T00:00:00`, { timeZone })
      : new Date(endDate);

    if (Number.isNaN(windowStart.getTime()) || Number.isNaN(windowEnd.getTime())) {
      throw new BadRequestException('Invalid start or end date');
    }
    if (windowEnd.getTime() <= windowStart.getTime()) {
      throw new BadRequestException('End date must not be before the start date');
    }

    // Check which sitters are available
    const availableSitters = [];
    
    for (const sitter of allSitters) {
      const conflicts = await this.checkAvailability(
        windowStart,
        windowEnd,
        sitter._id.toString()
      );

      if (conflicts.length === 0) {
        // Check if sitter services the required pet types
        if (!petTypes || petTypes.every(petType => 
          sitter.petTypesServiced?.includes(petType) || sitter.petTypesServiced?.length === 0
        )) {
          availableSitters.push(sitter);
        }
      }
    }

    return availableSitters;
  }

  /**
   * Get client's booking history with pagination
   */
  async getClientBookingHistory(
    clientId: string,
    currentUserId: string,
    currentUserRole: string,
    page: number = 1,
    limit: number = 20,
    status?: string
  ): Promise<{ bookings: BookingDocument[]; total: number; stats: any }> {
    // Clients can only view their own bookings, admins can view any
    if (clientId !== currentUserId && currentUserRole !== 'admin') {
      throw new ForbiddenException('You can only view your own bookings');
    }

    const filter: any = { userId: new Types.ObjectId(clientId) };
    if (status) {
      filter.status = status;
    }

    const skip = (page - 1) * limit;

    const [bookings, total, stats] = await Promise.all([
      this.bookingModel
        .find(filter)
        .populate('sitterId', 'firstName lastName profilePicture rating')
        .populate('createdBy', 'firstName lastName role')
        .sort({ startDate: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.bookingModel.countDocuments(filter),
      this.getBookingStats(clientId)
    ]);

    return { bookings, total, stats };
  }

  /**
   * Get booking statistics
   */
  async getBookingStats(clientId?: string): Promise<any> {
    const matchFilter = (clientId && clientId.trim() !== '') ? { userId: new Types.ObjectId(clientId) } : {};

    const stats = await this.bookingModel.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' },
        },
      },
    ]);

    const totalBookings = await this.bookingModel.countDocuments(matchFilter);
    const totalRevenue = await this.bookingModel.aggregate([
      { $match: { ...matchFilter, paymentStatus: 'paid' } },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);

    return {
      totalBookings,
      totalRevenue: totalRevenue.length > 0 ? totalRevenue[0].total : 0,
      statusBreakdown: stats,
    };
  }

  /**
   * Add visit log to booking
   */
  async addVisitLog(
    bookingId: string,
    visitData: {
      date: Date;
      notes: string;
      photos?: string[];
      duration?: number;
      activities?: string[];
    },
    currentUserId: string,
    currentUserRole: string
  ): Promise<BookingDocument> {
    const booking = await this.bookingModel.findById(bookingId);
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // Only assigned sitter or admin can add visit logs
    if (booking.sitterId?.toString() !== currentUserId && currentUserRole !== 'admin') {
      throw new ForbiddenException('Only the assigned sitter can add visit logs');
    }

    booking.visits = booking.visits || [];
    booking.visits.push({
      date: visitData.date,
      notes: visitData.notes,
      photos: visitData.photos || [],
      duration: visitData.duration || 0,
      activities: visitData.activities || [],
    });

    return booking.save();
  }

  /**
   * Add notes to booking with email notifications
   */
  async addNotes(
    bookingId: string,
    notes: string,
    noteType: 'client' | 'sitter' | 'admin',
    currentUserId: string,
    currentUserRole: string
  ): Promise<BookingDocument> {
    const booking = await this.bookingModel.findById(bookingId)
      .populate('userId', 'firstName lastName email')
      .populate('sitterId', 'firstName lastName email')
      .exec();
      
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // Check permissions
    if (noteType === 'client' && booking.userId._id.toString() !== currentUserId && currentUserRole !== 'admin') {
      throw new ForbiddenException('You can only add notes to your own bookings');
    }
    if (noteType === 'sitter' && booking.sitterId?._id.toString() !== currentUserId && currentUserRole !== 'admin') {
      throw new ForbiddenException('Only the assigned sitter can add sitter notes');
    }
    if (noteType === 'admin' && currentUserRole !== 'admin') {
      throw new ForbiddenException('Only administrators can add admin notes');
    }

    // Get sender information
    const sender = await this.userModel.findById(currentUserId).exec();
    const senderName = sender ? `${sender.firstName} ${sender.lastName}` : 'Unknown User';
    const senderRole = noteType;

    // Add notes based on type
    const timestamp = `[${new Date().toISOString()}]`;
    switch (noteType) {
      case 'client':
        booking.clientNotes = (booking.clientNotes || '') + '\n' + `${timestamp} ${notes}`;
        break;
      case 'sitter':
        booking.sitterNotes = (booking.sitterNotes || '') + '\n' + `${timestamp} ${notes}`;
        break;
      case 'admin':
        booking.adminNotes = (booking.adminNotes || '') + '\n' + `${timestamp} ${notes}`;
        break;
    }

    const savedBooking = await booking.save();

    // Send email notifications to relevant parties
    await this.sendNoteNotifications(savedBooking, notes, senderName, senderRole);

    return savedBooking;
  }

  /**
   * Send note notification emails to relevant parties
   */
  private async sendNoteNotifications(
    booking: any,
    note: string,
    senderName: string,
    senderRole: string
  ): Promise<void> {
    try {
      console.log(`📧 Starting note notification emails for booking ${booking._id}`);
      console.log(`📧 Sender: ${senderName} (${senderRole})`);
      
      const client = booking.userId;
      const sitter = booking.sitterId;
      const adminEmail = process.env.ADMIN_EMAIL || 'admin@whiskarz.com';

      console.log(`📧 Client: ${client?.email || 'N/A'}`);
      console.log(`📧 Sitter: ${sitter?.email || 'N/A'}`);
      console.log(`📧 Admin: ${adminEmail}`);

      // Determine who should receive the notification based on sender role
      if (senderRole === 'client') {
        console.log(`📧 Client note detected - notifying sitter and admin`);
        // Client sent a note → notify sitter and admin
        if (sitter && sitter.email) {
          console.log(`📧 Sending email to sitter: ${sitter.email}`);
          await this.emailService.sendNoteNotificationEmail(
            booking,
            note,
            senderName,
            'Client',
            sitter.email,
            `${sitter.firstName} ${sitter.lastName}`
          );
          console.log(`✅ Email sent to sitter`);
        } else {
          console.log(`⚠️ No sitter assigned or no sitter email`);
        }
        
        // Notify admin
        console.log(`📧 Sending email to admin: ${adminEmail}`);
        await this.emailService.sendNoteNotificationEmail(
          booking,
          note,
          senderName,
          'Client',
          adminEmail,
          'Admin'
        );
        console.log(`✅ Email sent to admin`);
      } else if (senderRole === 'sitter') {
        console.log(`📧 Sitter note detected - notifying client and admin`);
        // Sitter sent a note → notify client and admin
        console.log(`📧 Sending email to client: ${client.email}`);
        await this.emailService.sendNoteNotificationEmail(
          booking,
          note,
          senderName,
          'Sitter',
          client.email,
          `${client.firstName} ${client.lastName}`
        );
        console.log(`✅ Email sent to client`);
        
        // Notify admin
        console.log(`📧 Sending email to admin: ${adminEmail}`);
        await this.emailService.sendNoteNotificationEmail(
          booking,
          note,
          senderName,
          'Sitter',
          adminEmail,
          'Admin'
        );
        console.log(`✅ Email sent to admin`);
      } else if (senderRole === 'admin') {
        console.log(`📧 Admin note detected - notifying client and sitter`);
        // Admin sent a note → notify both client and sitter
        console.log(`📧 Sending email to client: ${client.email}`);
        await this.emailService.sendNoteNotificationEmail(
          booking,
          note,
          senderName,
          'Admin',
          client.email,
          `${client.firstName} ${client.lastName}`
        );
        console.log(`✅ Email sent to client`);
        
        if (sitter && sitter.email) {
          console.log(`📧 Sending email to sitter: ${sitter.email}`);
          await this.emailService.sendNoteNotificationEmail(
            booking,
            note,
            senderName,
            'Admin',
            sitter.email,
            `${sitter.firstName} ${sitter.lastName}`
          );
          console.log(`✅ Email sent to sitter`);
        } else {
          console.log(`⚠️ No sitter assigned or no sitter email`);
        }
      }

      console.log(`✅ All note notification emails sent successfully for booking ${booking._id}`);
    } catch (error) {
      console.error(`❌ Failed to send note notification emails for booking ${booking._id}:`, error);
      console.error(`❌ Error details:`, (error as Error)?.message);
      console.error(`❌ Stack trace:`, (error as Error)?.stack);
      // Don't throw error - notification failure shouldn't break note creation
    }
  }

  /**
   * Get all bookings for a specific user
   */
  async findByUserId(userId: string): Promise<Booking[]> {
    return this.bookingModel
      .find({ userId: new Types.ObjectId(userId) })
      .populate('userId', 'email address firstName lastName')
      .populate('sitterId', 'email firstName lastName profilePicture')
      .populate('createdBy', 'email firstName lastName role')
      .sort({ startDate: -1 })
      .exec();
  }

  /**
   * Get all bookings assigned to a sitter
   */
  async findBySitterId(sitterId: string): Promise<Booking[]> {
    return this.bookingModel
      .find({ sitterId })
      .populate('userId', 'email address emergencyContact firstName lastName')
      .populate('sitterId', 'email firstName lastName')
      .populate('createdBy', 'email firstName lastName role')
      .sort({ startDate: -1 })
      .exec();
  }

  /**
   * Paginated admin bookings list with search + status + date range filter.
   */
  async findAllPaginated(
    query: PaginationQuery & { status?: string; from?: string; to?: string },
  ): Promise<PaginatedResult<any>> {
    const { page, limit, skip, search, sortBy, sortOrder } = parsePagination(query);
    const filter: any = {};
    if (query.status && query.status !== 'all') filter.status = query.status;
    if (query.from || query.to) {
      filter.startDate = {};
      if (query.from) filter.startDate.$gte = new Date(query.from);
      if (query.to) filter.startDate.$lte = new Date(query.to);
    }
    if (search) {
      const regex = new RegExp(escapeRegex(search), 'i');
      filter.$or = [
        { serviceType: regex },
        { status: regex },
        { paymentStatus: regex },
      ];
    }
    const sort: any = sortBy ? { [sortBy]: sortOrder } : { startDate: -1 };

    const [docs, total] = await Promise.all([
      this.bookingModel
        .find(filter)
        .populate('userId', 'email address firstName lastName')
        .populate('sitterId', 'email firstName lastName')
        .populate('createdBy', 'email firstName lastName role')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .exec(),
      this.bookingModel.countDocuments(filter).exec(),
    ]);

    return buildPaginatedResult(docs, total, page, limit);
  }

  /**
   * Get all bookings grouped by bookingGroupId (admin only).
   * Multi-day bookings (sharing a bookingGroupId) collapse into one group entry;
   * single-day bookings appear as their own one-item group.
   *
   * Pass `userId` / `sitterId` to scope the groups to a single client or sitter
   * (used by the client- and sitter-facing bookings pages).
   */
  async findAllGrouped(
    query?: PaginationQuery & { status?: string; userId?: string; sitterId?: string },
  ): Promise<any[] | PaginatedResult<any>> {
    const filter: any = {};
    if (query?.userId) filter.userId = new Types.ObjectId(query.userId);
    if (query?.sitterId) filter.sitterId = new Types.ObjectId(query.sitterId);

    const bookings = await this.bookingModel
      .find(filter)
      .populate('userId', 'email address firstName lastName')
      .populate('sitterId', 'email firstName lastName profilePicture')
      .populate('createdBy', 'email firstName lastName role')
      .sort({ startDate: 1 })
      .exec();

    const groups = new Map<string, any>();

    for (const b of bookings as any[]) {
      // Standalone bookings get their own group keyed by their _id
      const key = b.bookingGroupId ? `group:${b.bookingGroupId}` : `single:${b._id.toString()}`;

      const existing = groups.get(key);
      if (!existing) {
        groups.set(key, {
          bookingGroupId: b.bookingGroupId || null,
          isGrouped: Boolean(b.bookingGroupId),
          bookings: [b],
          userId: b.userId,
          sitterId: b.sitterId,
          serviceType: b.serviceType,
          startDate: b.startDate,
          endDate: b.endDate,
          totalAmount: b.totalAmount || 0,
          statuses: [b.status],
          paymentStatuses: [b.paymentStatus],
        });
      } else {
        existing.bookings.push(b);
        existing.totalAmount += b.totalAmount || 0;
        existing.statuses.push(b.status);
        existing.paymentStatuses.push(b.paymentStatus);
        if (new Date(b.startDate) < new Date(existing.startDate)) existing.startDate = b.startDate;
        if (new Date(b.endDate) > new Date(existing.endDate)) existing.endDate = b.endDate;
        // Prefer a populated sitter if any day has one
        if (!existing.sitterId && b.sitterId) existing.sitterId = b.sitterId;
      }
    }

    let groupRows = Array.from(groups.values()).map((g) => {
      const uniqueStatuses = Array.from(new Set(g.statuses));
      const uniquePayments = Array.from(new Set(g.paymentStatuses));
      // A group holds one record per visit and a day can hold several visits,
      // so days are counted as distinct calendar dates, never as record count.
      const dayKeys = new Set<string>(
        g.bookings
          .filter((b: any) => b.startDate)
          .map((b: any) => businessDayKey(new Date(b.startDate), DEFAULT_BUSINESS_TIMEZONE)),
      );
      // Legacy single records can still span several days on their own.
      const span = g.startDate && g.endDate
        ? Math.max(
            1,
            calendarDaysBetween(
              businessDayKey(new Date(g.startDate), DEFAULT_BUSINESS_TIMEZONE),
              businessDayKey(new Date(g.endDate), DEFAULT_BUSINESS_TIMEZONE),
            ) + 1,
          )
        : 1;
      const dayCount = Math.max(dayKeys.size, span, 1);
      return {
        ...g,
        dayCount,
        visitCount: g.bookings.length,
        status: uniqueStatuses.length === 1 ? uniqueStatuses[0] : 'mixed',
        paymentStatus: uniquePayments.length === 1 ? uniquePayments[0] : 'mixed',
      };
    });

    // Sort newest first by group startDate for stable pagination
    groupRows.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());

    if (!query || (query.page === undefined && query.limit === undefined)) {
      return groupRows;
    }

    // Apply optional search + status filter, then paginate
    const search = (query.search ?? '').toString().trim().toLowerCase();
    const statusFilter = query.status && query.status !== 'all' ? query.status : null;

    if (statusFilter) {
      groupRows = groupRows.filter((g) => g.status === statusFilter);
    }
    if (search) {
      groupRows = groupRows.filter((g) => {
        const u = g.userId as any;
        const s = g.sitterId as any;
        const clientName = u
          ? `${u.firstName ?? ''} ${u.lastName ?? ''} ${u.email ?? ''}`.toLowerCase()
          : '';
        const sitterName = s
          ? `${s.firstName ?? ''} ${s.lastName ?? ''} ${s.email ?? ''}`.toLowerCase()
          : '';
        return (
          (g.serviceType ?? '').toLowerCase().includes(search) ||
          clientName.includes(search) ||
          sitterName.includes(search) ||
          (g.status ?? '').toLowerCase().includes(search)
        );
      });
    }

    const { page, limit, skip } = parsePagination(query);
    const total = groupRows.length;
    const slice = groupRows.slice(skip, skip + limit);
    return buildPaginatedResult(slice, total, page, limit);
  }

  /**
   * Bulk-update status for every booking sharing a bookingGroupId (admin only).
   */
  async updateGroupStatus(
    bookingGroupId: string,
    status: string,
    adminUserId: string,
  ): Promise<{ modifiedCount: number; status: string }> {
    const allowed = ['pending', 'confirmed', 'assigned', 'in_progress', 'completed', 'cancelled'];
    if (!allowed.includes(status)) {
      throw new BadRequestException('Invalid status');
    }

    const bookings = await this.bookingModel
      .find({ bookingGroupId })
      .populate('userId', 'firstName lastName email phoneNumber address emergencyContact')
      .populate('sitterId', 'firstName lastName email')
      .exec();

    if (bookings.length === 0) {
      throw new NotFoundException('No bookings found for this group');
    }

    const originalStatuses = bookings.map((b) => b.status);
    const result = await this.bookingModel
      .updateMany({ bookingGroupId }, { $set: { status } })
      .exec();

    // Fire rejection emails once per group if moving to cancelled
    if (status === 'cancelled') {
      const firstBooking = bookings[0] as any;
      if (originalStatuses.some((s) => s !== 'cancelled')) {
        // Compute the group's full date range so the email reflects every day in the booking,
        // not just the first day's record. This is what makes a 4-day group send one email
        // covering all four days, rather than one per day.
        const groupStart = bookings.reduce(
          (min, b) => (new Date(b.startDate) < new Date(min) ? b.startDate : min),
          bookings[0].startDate,
        );
        const groupEnd = bookings.reduce(
          (max, b) => (new Date(b.endDate) > new Date(max) ? b.endDate : max),
          bookings[0].endDate,
        );
        try {
          await this.emailService.sendBookingRejectedEmails(
            firstBooking,
            firstBooking.userId,
            undefined,
            groupStart,
            groupEnd,
          );
        } catch (error) {
          console.error('Failed to send group rejection email:', (error as Error)?.message || error);
        }
      }
    }

    try {
      await this.activityLogService.log(
        adminUserId,
        'Booking group status updated',
        'booking',
        `Updated ${result.modifiedCount} bookings in group ${bookingGroupId} to ${status}`,
        { bookingGroupId, status },
        bookingGroupId,
        'booking',
      );
    } catch (error) {
      console.error('Failed to write group status activity log:', (error as Error)?.message || error);
    }

    return { modifiedCount: result.modifiedCount, status };
  }

  /**
   * Bulk-update payment status for every booking sharing a bookingGroupId (admin only).
   * Sends one payment-confirmed email per group when transitioning to 'paid'.
   */
  async updateGroupPaymentStatus(
    bookingGroupId: string,
    paymentStatus: string,
    adminUserId: string,
  ): Promise<{ modifiedCount: number; paymentStatus: string }> {
    const allowed = ['pending', 'partial', 'paid', 'refunded'];
    if (!allowed.includes(paymentStatus)) {
      throw new BadRequestException('Invalid payment status');
    }

    const bookings = await this.bookingModel
      .find({ bookingGroupId })
      .populate('userId', 'firstName lastName email phoneNumber address emergencyContact')
      .populate('sitterId', 'firstName lastName email')
      .exec();

    if (bookings.length === 0) {
      throw new NotFoundException('No bookings found for this group');
    }

    const wasAlreadyPaid = bookings.every((b) => b.paymentStatus === 'paid');
    const result = await this.bookingModel
      .updateMany({ bookingGroupId }, { $set: { paymentStatus } })
      .exec();

    // Fire one payment-confirmed email per group when newly paid
    if (paymentStatus === 'paid' && !wasAlreadyPaid) {
      const anchor = bookings[0] as any;
      try {
        await this.emailService.sendBookingConfirmedPaidEmails(
          anchor,
          anchor.userId,
          anchor.sitterId,
        );
      } catch (error) {
        console.error(
          'Failed to send group paid confirmation email:',
          (error as Error)?.message || error,
        );
      }
    }

    try {
      await this.activityLogService.log(
        adminUserId,
        'Booking group payment status updated',
        'booking',
        `Updated ${result.modifiedCount} bookings in group ${bookingGroupId} payment to ${paymentStatus}`,
        { bookingGroupId, paymentStatus },
        bookingGroupId,
        'booking',
      );
    } catch (error) {
      console.error(
        'Failed to write group payment status activity log:',
        (error as Error)?.message || error,
      );
    }

    return { modifiedCount: result.modifiedCount, paymentStatus };
  }

  /**
   * Bulk-assign sitter to every booking in a group (admin only).
   */
  async assignSitterToGroup(
    bookingGroupId: string,
    sitterId: string,
    adminUserId: string,
  ): Promise<{ modifiedCount: number }> {
    const bookings = await this.bookingModel.find({ bookingGroupId }).exec();
    if (bookings.length === 0) {
      throw new NotFoundException('No bookings found for this group');
    }

    const result = await this.bookingModel
      .updateMany(
        { bookingGroupId },
        { $set: { sitterId: new Types.ObjectId(sitterId), status: 'assigned' } },
      )
      .exec();

    // Send one assignment email for the group
    const populated = await this.bookingModel
      .findOne({ bookingGroupId })
      .populate('userId', 'firstName lastName email phoneNumber address emergencyContact')
      .populate('sitterId', 'firstName lastName email')
      .exec();
    if (populated) {
      const groupStart = bookings.reduce(
        (min, b) => (new Date(b.startDate) < new Date(min) ? b.startDate : min),
        bookings[0].startDate,
      );
      const groupEnd = bookings.reduce(
        (max, b) => (new Date(b.endDate) > new Date(max) ? b.endDate : max),
        bookings[0].endDate,
      );
      await this.sendSitterAssignmentNotification(populated, groupStart, groupEnd);
    }

    try {
      await this.activityLogService.log(
        adminUserId,
        'Sitter assigned to booking group',
        'booking',
        `Assigned sitter ${sitterId} to group ${bookingGroupId} (${result.modifiedCount} bookings)`,
        { bookingGroupId, sitterId },
        bookingGroupId,
        'booking',
      );
    } catch (error) {
      console.error('Failed to write group assign activity log:', (error as Error)?.message || error);
    }

    return { modifiedCount: result.modifiedCount };
  }

  /**
   * Get all bookings (admin only)
   */
  async findAll(): Promise<Booking[]> {
    return this.bookingModel
      .find()
      .populate('userId', 'email address firstName lastName')
      .populate('sitterId', 'email firstName lastName')
      .populate('createdBy', 'email firstName lastName role')
      .sort({ startDate: -1 })
      .exec();
  }

  /**
   * Return the booking-group object for a given booking id.
   * - If the booking belongs to a multi-day group (bookingGroupId set),
   *   includes every day record in that group.
   * - Otherwise returns a single-item group containing just that booking.
   *
   * Access control: client can view their own group; sitter can view groups
   * that include a day assigned to them; admin can view any group.
   */
  async getGroupDetailForBooking(
    bookingId: string,
    currentUserId: string,
    currentUserRole: string,
  ): Promise<any> {
    const anchor = await this.bookingModel
      .findById(bookingId)
      .populate('userId', 'email address emergencyContact firstName lastName')
      .populate('sitterId', 'email firstName lastName profilePicture')
      .populate('createdBy', 'email firstName lastName role')
      .exec();
    if (!anchor) {
      throw new NotFoundException('Booking not found');
    }

    const groupId = (anchor as any).bookingGroupId;
    const days = groupId
      ? await this.bookingModel
          .find({ bookingGroupId: groupId })
          .populate('userId', 'email address emergencyContact firstName lastName')
          .populate('sitterId', 'email firstName lastName profilePicture')
          .populate('createdBy', 'email firstName lastName role')
          .sort({ startDate: 1 })
          .exec()
      : [anchor];

    // Access control — at least one day must be viewable by the current user
    const isAdmin = currentUserRole === 'admin';
    const canAccess =
      isAdmin ||
      days.some(
        (d) =>
          (d.userId as any)?._id?.toString() === currentUserId ||
          (d.sitterId as any)?._id?.toString() === currentUserId,
      );
    if (!canAccess) {
      throw new ForbiddenException('You can only view your own bookings');
    }

    let totalAmount = 0;
    let earliestStart: Date | null = null;
    let latestEnd: Date | null = null;
    const statuses: string[] = [];
    const paymentStatuses: string[] = [];

    for (const d of days) {
      totalAmount += d.totalAmount || 0;
      const s = new Date(d.startDate);
      const e = new Date(d.endDate);
      if (!earliestStart || s < earliestStart) earliestStart = s;
      if (!latestEnd || e > latestEnd) latestEnd = e;
      statuses.push(d.status);
      paymentStatuses.push(d.paymentStatus);
    }

    const uniqueStatuses = Array.from(new Set(statuses));
    const uniquePayments = Array.from(new Set(paymentStatuses));

    const MS_PER_DAY = 1000 * 60 * 60 * 24;
    const span =
      earliestStart && latestEnd
        ? Math.max(
            1,
            Math.round(
              (latestEnd.setHours(0, 0, 0, 0) - earliestStart.setHours(0, 0, 0, 0)) /
                MS_PER_DAY,
            ) + 1,
          )
        : 1;
    const dayCount = Math.max(days.length, span);

    return {
      bookingGroupId: groupId || null,
      isGrouped: Boolean(groupId),
      anchorId: bookingId,
      userId: anchor.userId,
      sitterId: anchor.sitterId,
      createdBy: (anchor as any).createdBy,
      serviceType: anchor.serviceType,
      numberOfPets: anchor.numberOfPets,
      petTypes: anchor.petTypes,
      notes: anchor.notes,
      adminNotes: anchor.adminNotes,
      clientNotes: anchor.clientNotes,
      sitterNotes: anchor.sitterNotes,
      serviceAddress: anchor.serviceAddress,
      specialInstructions: anchor.specialInstructions,
      startDate: earliestStart,
      endDate: latestEnd,
      dayCount,
      totalAmount,
      status: uniqueStatuses.length === 1 ? uniqueStatuses[0] : 'mixed',
      paymentStatus: uniquePayments.length === 1 ? uniquePayments[0] : 'mixed',
      bookings: days.map((d) => ({
        _id: d._id,
        startDate: d.startDate,
        endDate: d.endDate,
        totalAmount: d.totalAmount,
        status: d.status,
        paymentStatus: d.paymentStatus,
      })),
    };
  }

  /**
   * Get booking by ID with access control
   */
  async findById(
    bookingId: string, 
    currentUserId: string, 
    currentUserRole: string
  ): Promise<Booking> {
    const booking = await this.bookingModel
      .findById(bookingId)
      .populate('userId', 'email address emergencyContact firstName lastName')
      .populate('sitterId', 'email firstName lastName')
      .populate('createdBy', 'email firstName lastName role')
      .exec();
      
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // Access control: users can view their own bookings or assigned bookings
    const canAccess = 
      currentUserRole === 'admin' ||
      booking.userId._id.toString() === currentUserId ||
      booking.sitterId?._id.toString() === currentUserId
    if (!canAccess) {
      throw new ForbiddenException('You can only view your own bookings');
    }

    return booking;
  }

  /**
   * Update booking (admin can update any, users can update their own)
   */
  async update(
    bookingId: string,
    updateBookingDto: UpdateBookingDto,
    currentUserId: string,
    currentUserRole: string
  ): Promise<Booking> {
    const booking = await this.bookingModel.findById(bookingId)
      .populate('userId', 'firstName lastName email phoneNumber address emergencyContact')
      .populate('sitterId', 'firstName lastName email')
      .exec();
    
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // Access control: an admin may edit any booking, the client who owns it may
    // cancel it, and the sitter it is assigned to may move it through the work
    // statuses. Nobody else — a sitter must not be able to edit other sitters'
    // bookings, reassign them, or change what they cost.
    const isAdmin = currentUserRole === 'admin';
    const isOwner = idOf(booking.userId) === currentUserId;
    const isAssignedSitter =
      currentUserRole === 'sitter' && idOf(booking.sitterId) === currentUserId;

    if (!isAdmin && !isOwner && !isAssignedSitter) {
      throw new ForbiddenException('You can only update your own bookings');
    }

    // Store original status for comparison
    const originalStatus = booking.status;

    const updateData: any = { ...updateBookingDto };

    // visitSlots and timeZone describe a booking *request*; they are not stored
    // fields, and are inherited here only because the DTO extends the create DTO.
    delete updateData.visitSlots;
    delete updateData.timeZone;

    // An empty sitterId means "unassign" rather than an unparseable ObjectId.
    if (updateData.sitterId !== undefined && !updateData.sitterId?.toString().trim()) {
      updateData.sitterId = null;
    }

    const requestedFields = Object.keys(updateData);
    if (requestedFields.length === 0) {
      throw new BadRequestException('No fields to update');
    }

    if (!isAdmin) {
      const allowedFields = isAssignedSitter
        ? SITTER_UPDATABLE_FIELDS
        : CLIENT_UPDATABLE_FIELDS;
      for (const field of requestedFields) {
        if (!allowedFields.includes(field)) delete updateData[field];
      }

      if (Object.keys(updateData).length === 0) {
        throw new ForbiddenException(
          `Your role may only change: ${allowedFields.join(', ')}`,
        );
      }

      const settableStatuses = isAssignedSitter
        ? SITTER_SETTABLE_STATUSES
        : CLIENT_SETTABLE_STATUSES;
      if (updateData.status !== undefined && !settableStatuses.includes(updateData.status)) {
        throw new ForbiddenException(
          `Your role may only set the status to: ${settableStatuses.join(', ')}`,
        );
      }
    }

    // Moving a booking's time or sitter must not drop it on top of another
    // visit. Only admins can reach this, but the check belongs with the write.
    const movesWindow =
      updateData.startDate !== undefined ||
      updateData.endDate !== undefined ||
      updateData.sitterId !== undefined;

    if (movesWindow) {
      const nextStart = new Date(updateData.startDate ?? booking.startDate);
      const nextEnd = new Date(updateData.endDate ?? booking.endDate);

      if (Number.isNaN(nextStart.getTime()) || Number.isNaN(nextEnd.getTime())) {
        throw new BadRequestException('Invalid booking start or end date');
      }
      if (nextEnd.getTime() <= nextStart.getTime()) {
        throw new BadRequestException('A booking must end after it starts');
      }

      const nextSitterId =
        updateData.sitterId !== undefined
          ? updateData.sitterId?.toString().trim() || undefined
          : idOf(booking.sitterId);

      await this.assertNoVisitConflicts(
        [{ start: nextStart, end: nextEnd }],
        {
          userId: idOf(booking.userId),
          sitterId: nextSitterId,
          // The booking being edited is not a conflict with itself.
          excludeBookingIds: [bookingId],
        },
        DEFAULT_BUSINESS_TIMEZONE,
      );
    }

    const updatedBooking = await this.bookingModel
      .findByIdAndUpdate(bookingId, updateData, { new: true })
      .populate('userId', 'firstName lastName email phoneNumber address emergencyContact')
      .populate('sitterId', 'firstName lastName email')
      .populate('createdBy', 'email firstName lastName role')
      .exec();

    // Handle email notifications based on status changes
    if (updatedBooking && currentUserRole === 'admin') {
      await this.handleStatusChangeNotifications(
        updatedBooking, 
        originalStatus, 
      );
    }

    if (updatedBooking) {
      try {
        await this.activityLogService.log(
          currentUserId,
          'Booking updated',
          'booking',
          `Updated booking ${bookingId}`,
          {
            previousStatus: originalStatus,
            nextStatus: updatedBooking.status,
            role: currentUserRole,
          },
          bookingId,
          'booking',
        );
      } catch (error) {
        console.error('Failed to write booking update activity log:', (error as Error)?.message || error);
      }
    }

    return updatedBooking;
  }

  /**
   * Handle email notifications based on status changes (4-step workflow)
   */
  private async handleStatusChangeNotifications(
    booking: any,
    originalStatus: string,
  ): Promise<void> {
    try {
      const currentStatus = booking.status;
      const client = booking.userId;
      // const sitter = booking.sitterId;


      // Step 4: Booking rejected (any status → Rejected)
      if (currentStatus === 'cancelled' && originalStatus !== 'cancelled') {
        console.log(`❌ Step 4: Booking ${booking._id} rejected`);
        await this.emailService.sendBookingRejectedEmails(booking, client);
        console.log(`✅ Rejection emails sent for booking ${booking._id}`);
        return;
      }

      // Log other status changes that don't trigger emails
      if (originalStatus !== currentStatus) {
        console.log(`📝 Status changed for booking ${booking._id}: ${originalStatus} → ${currentStatus} (no emails triggered)`);
      }

    } catch (error) {
      console.error(`❌ Error handling status change notifications for booking ${booking._id}:`, error);
    }
  }

  /**
   * Delete booking
   */
  async delete(
    bookingId: string,
    currentUserId: string,
    currentUserRole: string
  ): Promise<void> {
    const booking = await this.bookingModel.findById(bookingId).exec();
    
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // Access control
    const canDelete = 
      currentUserRole === 'admin' ||
      booking.userId.toString() === currentUserId;

    if (!canDelete) {
      throw new ForbiddenException('You can only delete your own bookings');
    }

    await this.bookingModel.findByIdAndDelete(bookingId).exec();

    try {
      await this.activityLogService.log(
        currentUserId,
        'Booking deleted',
        'booking',
        `Deleted booking ${bookingId}`,
        { role: currentUserRole },
        bookingId,
        'booking',
      );
    } catch (error) {
      console.error('Failed to write booking delete activity log:', (error as Error)?.message || error);
    }
  }

  /**
   * Assign sitter to booking (admin only)
   */
  async assignSitter(bookingId: string, sitterId: string, assignedByUserId: string): Promise<Booking> {
    const booking = await this.bookingModel
      .findByIdAndUpdate(
        bookingId,
        { 
          sitterId, 
          status: 'assigned' 
        },
        { new: true }
      )
      .populate('userId', 'firstName lastName email phoneNumber address emergencyContact')
      .populate('sitterId', 'firstName lastName email')
      .populate('createdBy', 'firstName lastName role')
      .exec();

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // Send email notification to the assigned sitter
    if (booking.sitterId) {
      await this.sendSitterAssignmentNotification(booking);
    }

    try {
      await this.activityLogService.log(
        assignedByUserId,
        'Sitter assigned',
        'booking',
        `Assigned sitter ${sitterId} to booking ${bookingId}`,
        { sitterId },
        bookingId,
        'booking',
      );
    } catch (error) {
      console.error('Failed to write assign sitter activity log:', (error as Error)?.message || error);
    }

    return booking;
  }

  /**
   * Unassign sitter from booking (admin only)
   */
  async unassignSitter(bookingId: string): Promise<Booking> {
    const booking = await this.bookingModel
      .findByIdAndUpdate(
        bookingId,
        { $unset: { sitterId: "" }, status: 'pending' },
        { new: true }
      )
      .populate('userId', 'email address firstName lastName')
      .populate('sitterId', 'email firstName lastName')
      .populate('createdBy', 'email firstName lastName role')
      .exec();

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    return booking;
  }

  /**
   * Update payment status (admin only)
   */
  async updatePaymentStatus(bookingId: string, paymentStatus: string): Promise<Booking> {
    const allowedStatuses = ['pending', 'partial', 'paid', 'refunded'];
    if (!allowedStatuses.includes(paymentStatus)) {
      throw new BadRequestException('Invalid payment status');
    }

    // Get current booking to check original payment status
    const currentBooking = await this.bookingModel.findById(bookingId)
      .populate('userId', 'firstName lastName email phoneNumber address emergencyContact')
      .populate('sitterId', 'firstName lastName email')
      .exec();

    if (!currentBooking) {
      throw new NotFoundException('Booking not found');
    }

    const originalPaymentStatus = currentBooking.paymentStatus;

    const booking = await this.bookingModel.findByIdAndUpdate(
      bookingId,
      { paymentStatus },
      { new: true }
    )
    .populate('userId', 'firstName lastName email phoneNumber address emergencyContact')
    .populate('sitterId', 'firstName lastName email')
    .exec();

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // Send payment confirmation emails if status changed to 'paid'
    if (paymentStatus === 'paid' && originalPaymentStatus !== 'paid') {
      try {
        const client = booking.userId;
        const sitter = booking.sitterId;
        await this.emailService.sendBookingConfirmedPaidEmails(booking, client, sitter);
        console.log(`Payment confirmation emails sent for booking ${booking._id}`);
      } catch (error) {
        console.error(`Error sending payment confirmation emails for booking ${booking._id}:`, error);
      }
    }

    return booking;
  }

  /**
   * Get assigned sitters for a specific user/client
   */
  async getAssignedSitters(
    userId: string,
    currentUserId: string,
    currentUserRole: string
  ): Promise<any[]> {
    // Verify the requesting user can access this data
    if (userId !== currentUserId && currentUserRole !== 'admin') {
      throw new ForbiddenException('Access denied');
    }


    // First, let's check if there are any bookings for this user
    const userBookings = await this.bookingModel.find({ 
      userId: new Types.ObjectId(userId) 
    }).populate('sitterId', 'firstName lastName email phoneNumber emergencyContact address homeCareInfo profilePicture rating petTypesServiced');

    
    // Filter bookings that have assigned sitters
    const bookingsWithSitters = userBookings.filter(booking => booking.sitterId);

    if (bookingsWithSitters.length === 0) {
      return [];
    }

    // Create a map to group sitters and count their bookings
    const sitterMap = new Map();
    
    bookingsWithSitters.forEach(booking => {
      if (booking.sitterId) {
        const sitter = booking.sitterId as any; // Cast to any to access populated properties
        const sitterId = sitter._id.toString();
        
        if (sitterMap.has(sitterId)) {
          // Increment booking count for existing sitter
          const existingSitter = sitterMap.get(sitterId);
          existingSitter.activeBookingsCount += 1;
          existingSitter.totalAmountSpent += booking.totalAmount || 0;
          existingSitter.bookingStatuses.push(booking.status);
        } else {
          // Add new sitter with booking count
          sitterMap.set(sitterId, {
            _id: sitter._id,
            firstName: sitter.firstName,
            lastName: sitter.lastName,
            email: sitter.email,
            phoneNumber: sitter.phoneNumber,
            emergencyContact: sitter.emergencyContact,
            address: sitter.address,
            homeCareInfo: sitter.homeCareInfo,
            profilePicture: sitter.profilePicture,
            rating: sitter.rating,
            petTypesServiced: sitter.petTypesServiced,
            activeBookingsCount: 1,
            totalAmountSpent: booking.totalAmount || 0,
            bookingStatuses: [booking.status]
          });
        }
      }
    });

    // Convert map to array
    const assignedSitters = Array.from(sitterMap.values());

    return assignedSitters;
  }

}
