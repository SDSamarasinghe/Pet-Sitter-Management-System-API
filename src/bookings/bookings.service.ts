import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Booking, BookingDocument } from './schemas/booking.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { CreateBookingDto } from './dto/create-booking.dto';
import { CreateBookingAdminDto } from './dto/create-booking-admin.dto';
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

    // Calculate estimated cost (basic calculation - can be enhanced)
    const daysCount = Math.ceil((new Date(serviceInquiryDto.endDate).getTime() - new Date(serviceInquiryDto.startDate).getTime()) / (1000 * 60 * 60 * 24));
    const baseRate = 50; // Base rate per day
    const petMultiplier = serviceInquiryDto.numberOfPets * 0.8;
    const estimatedCost = Math.round(daysCount * baseRate * petMultiplier);

    // Create booking from service inquiry
    const booking = new this.bookingModel({
      userId: user._id,
      createdBy: user._id, // Service inquiry is created by the client themselves
      startDate: new Date(serviceInquiryDto.startDate),
      endDate: new Date(serviceInquiryDto.endDate),
      serviceType: 'Service Inquiry',
      numberOfPets: serviceInquiryDto.numberOfPets,
      petTypes: serviceInquiryDto.petTypes,
      status: 'pending',
      notes: serviceInquiryDto.additionalDetails || '',
      adminNotes: `Service inquiry from ${serviceInquiryDto.customerType} customer`,
      totalAmount: estimatedCost,
      paymentStatus: 'pending',
      serviceAddress: serviceInquiryDto.address,
      specialInstructions: serviceInquiryDto.additionalDetails,
    });

    await booking.save();

    return {
      message: 'Service inquiry submitted successfully. We will contact you soon!',
      bookingId: booking._id,
      customerType: serviceInquiryDto.customerType,
      estimatedCost,
    };
  }

  /**
   * Create a new booking
   */
  async create(createBookingDto: CreateBookingDto, userId: string): Promise<Booking> {
    // Check for availability conflicts
    const conflicts = await this.checkAvailability(
      new Date(createBookingDto.startDate),
      new Date(createBookingDto.endDate),
      createBookingDto.sitterId
    );

    if (conflicts.length > 0) {
      throw new BadRequestException('Selected dates conflict with existing bookings');
    }

    const newBooking = new this.bookingModel({
      ...createBookingDto,
      userId: new Types.ObjectId(userId),
      createdBy: new Types.ObjectId(userId), // Regular booking created by the client themselves
      sitterId: (createBookingDto.sitterId && createBookingDto.sitterId.trim() !== '') 
        ? new Types.ObjectId(createBookingDto.sitterId) 
        : undefined,
      startDate: new Date(createBookingDto.startDate),
      endDate: new Date(createBookingDto.endDate),
      status: 'pending',
      paymentStatus: 'pending',
    });
    
    return newBooking.save();
  }

  /**
   * Create a new booking by admin on behalf of client
   */
  async createByAdmin(
    createBookingAdminDto: CreateBookingAdminDto, 
    adminUserId: string
  ): Promise<Booking> {
    // Check for availability conflicts
    const conflicts = await this.checkAvailability(
      new Date(createBookingAdminDto.startDate),
      new Date(createBookingAdminDto.endDate),
      createBookingAdminDto.sitterId
    );

    if (conflicts.length > 0) {
      throw new BadRequestException('Selected dates conflict with existing bookings');
    }

    // Verify the client exists
    const client = await this.userModel.findById(createBookingAdminDto.userId);
    if (!client) {
      throw new NotFoundException('Client not found');
    }

    const newBooking = new this.bookingModel({
      ...createBookingAdminDto,
      userId: new Types.ObjectId(createBookingAdminDto.userId), // Client for whom booking is created
      createdBy: new Types.ObjectId(adminUserId), // Admin who created the booking
      sitterId: (createBookingAdminDto.sitterId && createBookingAdminDto.sitterId.trim() !== '') 
        ? new Types.ObjectId(createBookingAdminDto.sitterId) 
        : undefined,
      startDate: new Date(createBookingAdminDto.startDate),
      endDate: new Date(createBookingAdminDto.endDate),
      status: 'pending',
      paymentStatus: 'pending',
    });
    
    return newBooking.save();
  }

  /**
   * Check availability for dates
   */
  async checkAvailability(
    startDate: Date,
    endDate: Date,
    sitterId?: string
  ): Promise<BookingDocument[]> {
    const query: any = {
      status: { $in: ['confirmed', 'assigned', 'in_progress'] },
      $or: [
        {
          startDate: { $lte: endDate },
          endDate: { $gte: startDate }
        }
      ]
    };

    if (sitterId && sitterId.trim() !== '') {
      query.sitterId = new Types.ObjectId(sitterId);
    }

    return this.bookingModel.find(query).populate('sitterId', 'firstName lastName');
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

    // Check which sitters are available
    const availableSitters = [];
    
    for (const sitter of allSitters) {
      const conflicts = await this.checkAvailability(
        new Date(startDate),
        new Date(endDate),
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
   * Add notes to booking
   */
  async addNotes(
    bookingId: string,
    notes: string,
    noteType: 'client' | 'sitter' | 'admin',
    currentUserId: string,
    currentUserRole: string
  ): Promise<BookingDocument> {
    const booking = await this.bookingModel.findById(bookingId);
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // Check permissions
    if (noteType === 'client' && booking.userId.toString() !== currentUserId && currentUserRole !== 'admin') {
      throw new ForbiddenException('You can only add notes to your own bookings');
    }
    if (noteType === 'sitter' && booking.sitterId?.toString() !== currentUserId && currentUserRole !== 'admin') {
      throw new ForbiddenException('Only the assigned sitter can add sitter notes');
    }
    if (noteType === 'admin' && currentUserRole !== 'admin') {
      throw new ForbiddenException('Only administrators can add admin notes');
    }

    // Add notes based on type
    switch (noteType) {
      case 'client':
        booking.clientNotes = (booking.clientNotes || '') + '\n' + `[${new Date().toISOString()}] ${notes}`;
        break;
      case 'sitter':
        booking.sitterNotes = (booking.sitterNotes || '') + '\n' + `[${new Date().toISOString()}] ${notes}`;
        break;
      case 'admin':
        booking.adminNotes = (booking.adminNotes || '') + '\n' + `[${new Date().toISOString()}] ${notes}`;
        break;
    }

    return booking.save();
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
    const booking = await this.bookingModel.findById(bookingId).exec();
    
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // Access control
    const canUpdate = 
      currentUserRole === 'admin' ||
      currentUserRole === 'sitter'

    if (!canUpdate) {
      throw new ForbiddenException('You can only update your own bookings');
    }

    // Restrict certain fields to admin only
    const updateData: any = { ...updateBookingDto };
    
    // Only admin can update status, sitterId, or adminNotes
    // if (currentUserRole !== 'admin') {
    //   delete updateData.status;
    //   delete updateData.sitterId;
    //   delete updateData.adminNotes;
    // }

    // Convert date string to Date object if provided
    if (updateData.date) {
      updateData.date = new Date(updateData.date);
    }

    const updatedBooking = await this.bookingModel
      .findByIdAndUpdate(bookingId, updateData, { new: true })
      .populate('userId', 'email address firstName lastName')
      .populate('sitterId', 'email firstName lastName')
      .populate('createdBy', 'email firstName lastName role')
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
    const booking = await this.bookingModel.findByIdAndUpdate(
      bookingId,
      { paymentStatus },
      { new: true }
    ).exec();
    if (!booking) {
      throw new NotFoundException('Booking not found');
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

    console.log(`Getting assigned sitters for userId: ${userId}`);

    // First, let's check if there are any bookings for this user
    const userBookings = await this.bookingModel.find({ 
      userId: new Types.ObjectId(userId) 
    }).populate('sitterId', 'firstName lastName email phoneNumber emergencyContact address homeCareInfo profilePicture rating petTypesServiced');

    console.log(`Found ${userBookings.length} total bookings for user ${userId}`);
    
    // Filter bookings that have assigned sitters
    const bookingsWithSitters = userBookings.filter(booking => booking.sitterId);
    console.log(`Found ${bookingsWithSitters.length} bookings with assigned sitters`);

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
    console.log(`Returning ${assignedSitters.length} assigned sitters`);

    return assignedSitters;
  }

}
