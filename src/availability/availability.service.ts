import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { 
  AvailabilitySettings, 
  AvailabilitySettingsDocument 
} from './schemas/availability-settings.schema';
import { 
  AvailabilitySlot, 
  AvailabilitySlotDocument 
} from './schemas/availability-slot.schema';
import { 
  CreateAvailabilitySettingsDto, 
  UpdateAvailabilitySettingsDto 
} from './dto/availability-settings.dto';
import { 
  CreateAvailabilitySlotDto, 
  UpdateAvailabilitySlotDto,
  AvailabilityCheckDto 
} from './dto/availability-slot.dto';

@Injectable()
export class AvailabilityService {
  constructor(
    @InjectModel(AvailabilitySettings.name)
    private availabilitySettingsModel: Model<AvailabilitySettingsDocument>,
    @InjectModel(AvailabilitySlot.name)
    private availabilitySlotModel: Model<AvailabilitySlotDocument>,
  ) {}

  // Availability Settings Management
  async createOrUpdateSettings(
    sitterId: string, 
    createDto: CreateAvailabilitySettingsDto
  ): Promise<AvailabilitySettings> {
    const existingSettings = await this.availabilitySettingsModel.findOne({ 
      sitterId: new Types.ObjectId(sitterId) 
    });

    if (existingSettings) {
      Object.assign(existingSettings, createDto);
      return existingSettings.save();
    }

    const newSettings = new this.availabilitySettingsModel({
      sitterId: new Types.ObjectId(sitterId),
      ...createDto,
    });

    return newSettings.save();
  }

  async getSettings(sitterId: string): Promise<AvailabilitySettings> {
    const settings = await this.availabilitySettingsModel.findOne({ 
      sitterId: new Types.ObjectId(sitterId) 
    });

    if (!settings) {
      // Return default settings if none exist
      return this.createDefaultSettings(sitterId);
    }

    return settings;
  }

  async updateSettings(
    sitterId: string, 
    updateDto: UpdateAvailabilitySettingsDto
  ): Promise<AvailabilitySettings> {
    const settings = await this.availabilitySettingsModel.findOneAndUpdate(
      { sitterId: new Types.ObjectId(sitterId) },
      updateDto,
      { new: true, upsert: true }
    );

    if (!settings) {
      throw new NotFoundException('Settings not found');
    }

    return settings;
  }

  private async createDefaultSettings(sitterId: string): Promise<AvailabilitySettings> {
    const defaultSchedule = {
      monday: { isAvailable: true, startTime: '09:00', endTime: '17:00' },
      tuesday: { isAvailable: true, startTime: '09:00', endTime: '17:00' },
      wednesday: { isAvailable: true, startTime: '09:00', endTime: '17:00' },
      thursday: { isAvailable: true, startTime: '09:00', endTime: '17:00' },
      friday: { isAvailable: true, startTime: '09:00', endTime: '17:00' },
      saturday: { isAvailable: false },
      sunday: { isAvailable: false },
    };

    const defaultSettings = new this.availabilitySettingsModel({
      sitterId: new Types.ObjectId(sitterId),
      weeklySchedule: defaultSchedule,
      maxDailyBookings: 5,
      advanceNoticeHours: 24,
      travelDistance: 10,
      holidayRates: {
        enabled: false,
        percentage: 0,
        holidays: [],
      },
      unavailableDates: [],
      isActive: true,
    });

    return defaultSettings.save();
  }

  // Availability Slots Management
  async createSlot(
    sitterId: string, 
    createDto: CreateAvailabilitySlotDto
  ): Promise<AvailabilitySlot> {
    // Check for overlapping slots
    const existingSlot = await this.checkSlotOverlap(sitterId, createDto);
    if (existingSlot) {
      throw new BadRequestException('Slot overlaps with existing availability');
    }

    const slot = new this.availabilitySlotModel({
      sitterId: new Types.ObjectId(sitterId),
      ...createDto,
      date: new Date(createDto.date),
    });

    return slot.save();
  }

  async getSlots(
    sitterId: string, 
    startDate?: string, 
    endDate?: string
  ): Promise<AvailabilitySlot[]> {
    const query: any = { sitterId: new Types.ObjectId(sitterId) };

    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    return this.availabilitySlotModel
      .find(query)
      .sort({ date: 1, startTime: 1 })
      .exec();
  }

  async getSlotById(sitterId: string, slotId: string): Promise<AvailabilitySlot> {
    const slot = await this.availabilitySlotModel.findOne({
      _id: new Types.ObjectId(slotId),
      sitterId: new Types.ObjectId(sitterId),
    });

    if (!slot) {
      throw new NotFoundException('Availability slot not found');
    }

    return slot;
  }

  async updateSlot(
    sitterId: string, 
    slotId: string, 
    updateDto: UpdateAvailabilitySlotDto
  ): Promise<AvailabilitySlot> {
    const slot = await this.availabilitySlotModel.findOneAndUpdate(
      { 
        _id: new Types.ObjectId(slotId),
        sitterId: new Types.ObjectId(sitterId) 
      },
      updateDto,
      { new: true }
    );

    if (!slot) {
      throw new NotFoundException('Availability slot not found');
    }

    return slot;
  }

  async deleteSlot(sitterId: string, slotId: string): Promise<void> {
    const result = await this.availabilitySlotModel.deleteOne({
      _id: new Types.ObjectId(slotId),
      sitterId: new Types.ObjectId(sitterId),
    });

    if (result.deletedCount === 0) {
      throw new NotFoundException('Availability slot not found');
    }
  }

  // Availability Check
  async checkAvailability(
    sitterId: string, 
    checkDto: AvailabilityCheckDto
  ): Promise<{
    isAvailable: boolean;
    availableSlots: AvailabilitySlot[];
    settings: AvailabilitySettings;
    conflicts: string[];
  }> {
    const settings = await this.getSettings(sitterId);
    const slots = await this.getSlots(sitterId, checkDto.startDate, checkDto.endDate);
    
    const conflicts: string[] = [];
    const availableSlots: AvailabilitySlot[] = [];

    // Check if dates are in unavailable dates
    const startDate = new Date(checkDto.startDate);
    const endDate = new Date(checkDto.endDate);
    
    for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
      const dateStr = date.toISOString().split('T')[0];
      
      if (settings.unavailableDates.includes(dateStr)) {
        conflicts.push(`Date ${dateStr} is marked as unavailable`);
        continue;
      }

      // Check weekly schedule
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const dayName = dayNames[date.getDay()] as keyof typeof settings.weeklySchedule;
      const daySchedule = settings.weeklySchedule[dayName];
      
      if (!daySchedule.isAvailable) {
        conflicts.push(`${dayName.charAt(0).toUpperCase() + dayName.slice(1)} is not available`);
        continue;
      }

      // Find available slots for this date
      const daySlots = slots.filter(slot => 
        slot.date.toISOString().split('T')[0] === dateStr && slot.isAvailable
      );
      
      availableSlots.push(...daySlots);
    }

    // Check advance notice
    const hoursUntilStart = (startDate.getTime() - new Date().getTime()) / (1000 * 60 * 60);
    if (hoursUntilStart < settings.advanceNoticeHours) {
      conflicts.push(`Booking requires ${settings.advanceNoticeHours} hours advance notice`);
    }

    // Check daily booking limits
    const bookingsOnDate = await this.availabilitySlotModel.countDocuments({
      sitterId: new Types.ObjectId(sitterId),
      date: { $gte: startDate, $lte: endDate },
      bookingId: { $exists: true },
    });

    if (bookingsOnDate >= settings.maxDailyBookings) {
      conflicts.push(`Maximum daily bookings (${settings.maxDailyBookings}) reached`);
    }

    return {
      isAvailable: conflicts.length === 0,
      availableSlots,
      settings,
      conflicts,
    };
  }

  private async checkSlotOverlap(
    sitterId: string, 
    slotData: CreateAvailabilitySlotDto
  ): Promise<AvailabilitySlot | null> {
    const startTime = this.timeToMinutes(slotData.startTime);
    const endTime = this.timeToMinutes(slotData.endTime);

    const existingSlots = await this.availabilitySlotModel.find({
      sitterId: new Types.ObjectId(sitterId),
      date: new Date(slotData.date),
    });

    for (const slot of existingSlots) {
      const existingStart = this.timeToMinutes(slot.startTime);
      const existingEnd = this.timeToMinutes(slot.endTime);

      if (
        (startTime >= existingStart && startTime < existingEnd) ||
        (endTime > existingStart && endTime <= existingEnd) ||
        (startTime <= existingStart && endTime >= existingEnd)
      ) {
        return slot;
      }
    }

    return null;
  }

  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  // Bulk operations for slots
  async createMultipleSlots(
    sitterId: string, 
    slots: CreateAvailabilitySlotDto[]
  ): Promise<AvailabilitySlot[]> {
    const createdSlots: AvailabilitySlot[] = [];
    
    for (const slotData of slots) {
      try {
        const slot = await this.createSlot(sitterId, slotData);
        createdSlots.push(slot);
      } catch (error) {
        // Log error but continue with other slots
        console.error(`Failed to create slot: ${error.message}`);
      }
    }
    
    return createdSlots;
  }

  async deleteMultipleSlots(sitterId: string, slotIds: string[]): Promise<number> {
    const result = await this.availabilitySlotModel.deleteMany({
      _id: { $in: slotIds.map(id => new Types.ObjectId(id)) },
      sitterId: new Types.ObjectId(sitterId),
    });

    return result.deletedCount;
  }
}
