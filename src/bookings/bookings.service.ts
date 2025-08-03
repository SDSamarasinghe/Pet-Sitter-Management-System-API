import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Booking, BookingDocument } from './schemas/booking.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { ServiceInquiryDto } from './dto/service-inquiry.dto';

@Injectable()
export class BookingsService {
  constructor(
    @InjectModel(Booking.name) private bookingModel: Model<BookingDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  /**
   * Submit service inquiry (public endpoint)
   */
  async submitServiceInquiry(serviceInquiryDto: ServiceInquiryDto): Promise<any> {
    // Check if user already exists
    let user = await this.userModel.findOne({ email: serviceInquiryDto.email });
    
    if (!user) {
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
    }

    // Create booking from service inquiry
    const booking = new this.bookingModel({
      userId: user._id,
      startDate: new Date(serviceInquiryDto.startDate),
      endDate: new Date(serviceInquiryDto.endDate),
      serviceType: 'Service Inquiry',
      numberOfPets: serviceInquiryDto.numberOfPets,
      petTypes: serviceInquiryDto.petTypes,
      status: 'pending',
      notes: serviceInquiryDto.additionalDetails || '',
      adminNotes: `Service inquiry from ${serviceInquiryDto.customerType} customer`,
    });

    await booking.save();

    return {
      message: 'Service inquiry submitted successfully. We will contact you soon!',
      bookingId: booking._id,
      customerType: serviceInquiryDto.customerType,
    };
  }

  /**
   * Create a new booking
   */
  async create(createBookingDto: CreateBookingDto, userId: string): Promise<Booking> {
    const newBooking = new this.bookingModel({
      ...createBookingDto,
      userId,
      startDate: new Date(createBookingDto.startDate),
      endDate: new Date(createBookingDto.endDate),
    });
    
    return newBooking.save();
  }

  /**
   * Get all bookings for a specific user
   */
  async findByUserId(userId: string): Promise<Booking[]> {
    return this.bookingModel
      .find({ userId })
      .populate('userId', 'email address')
      .populate('sitterId', 'email')
      .sort({ startDate: -1 })
      .exec();
  }

  /**
   * Get all bookings assigned to a sitter
   */
  async findBySitterId(sitterId: string): Promise<Booking[]> {
    return this.bookingModel
      .find({ sitterId })
      .populate('userId', 'email address emergencyContact')
      .populate('sitterId', 'email')
      .sort({ startDate: -1 })
      .exec();
  }

  /**
   * Get all bookings (admin only)
   */
  async findAll(): Promise<Booking[]> {
    return this.bookingModel
      .find()
      .populate('userId', 'email address')
      .populate('sitterId', 'email')
      .sort({ startDate: -1 })
      .exec();
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
      .populate('userId', 'email address emergencyContact')
      .populate('sitterId', 'email')
      .exec();
      
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // Access control: users can view their own bookings or assigned bookings
    const canAccess = 
      currentUserRole === 'admin' ||
      booking.userId.toString() === currentUserId ||
      booking.sitterId?.toString() === currentUserId;

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
    const booking = await this.bookingModel.findById(bookingId).exec();
    
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // Access control
    const canUpdate = 
      currentUserRole === 'admin' ||
      booking.userId.toString() === currentUserId;

    if (!canUpdate) {
      throw new ForbiddenException('You can only update your own bookings');
    }

    // Restrict certain fields to admin only
    const updateData: any = { ...updateBookingDto };
    
    if (currentUserRole !== 'admin') {
      // Non-admin users cannot update status, sitterId, or adminNotes
      delete updateData.status;
      delete updateData.sitterId;
      delete updateData.adminNotes;
    }

    // Convert date string to Date object if provided
    if (updateData.date) {
      updateData.date = new Date(updateData.date);
    }

    const updatedBooking = await this.bookingModel
      .findByIdAndUpdate(bookingId, updateData, { new: true })
      .populate('userId', 'email address')
      .populate('sitterId', 'email')
      .exec();

    return updatedBooking;
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
  }

  /**
   * Assign sitter to booking (admin only)
   */
  async assignSitter(bookingId: string, sitterId: string): Promise<Booking> {
    const booking = await this.bookingModel
      .findByIdAndUpdate(
        bookingId,
        { 
          sitterId, 
          status: 'assigned' 
        },
        { new: true }
      )
      .populate('userId', 'email address')
      .populate('sitterId', 'email')
      .exec();

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    return booking;
  }
}
