import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Booking, BookingDocument } from './schemas/booking.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { CreateBookingDto } from './dto/create-booking.dto';
import { CreateBookingAdminDto } from './dto/create-booking-admin.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { ServiceInquiryDto } from './dto/service-inquiry.dto';
import { EmailService } from '../email/email.service';

@Injectable()
export class BookingsService {
  constructor(
    @InjectModel(Booking.name) private bookingModel: Model<BookingDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private emailService: EmailService,
  ) {}

  async deleteByAdmin(bookingId: string): Promise<void> {
    const booking = await this.bookingModel.findById(bookingId).exec();
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }
    await this.bookingModel.findByIdAndDelete(bookingId).exec();
  }

  /**
   * Send notifications for pending bookings (Step 1)
   */
  private async sendPendingBookingNotifications(booking: any): Promise<void> {
    try {
      const client = booking.userId;
      await this.emailService.sendPendingBookingEmails(booking, client);
      console.log(`Pending booking email notifications sent for booking ${booking._id}`);
    } catch (error) {
      console.error('Error sending pending booking notifications:', error);
    }
  }

  /**
   * Send email notification when sitter is assigned to existing booking
   */
  private async sendSitterAssignmentNotification(booking: BookingDocument): Promise<void> {
    try {
      // Get client and sitter information
      const client = await this.userModel.findById(booking.userId).exec();
      const sitter = await this.userModel.findById(booking.sitterId).exec();
      
      if (!client || !sitter) {
        console.log('Cannot send assignment email - client or sitter not found');
        return;
      }

      // Send email notification to the assigned sitter
      await this.emailService.sendSitterAssignmentEmail(booking, client, sitter);

      console.log(`✅ Sitter assignment notification sent for booking ${booking._id}`);
    } catch (error) {
      console.error('Failed to send sitter assignment notification:', error);
      // Don't throw error - email failure shouldn't break booking assignment
    }
  }

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

    // Populate the booking with user details for email notifications
    const populatedBooking = await this.bookingModel
      .findById(booking._id)
      .populate('userId', 'firstName lastName email phoneNumber address emergencyContact')
      .exec();

    // Send email notifications for service inquiry
    if (populatedBooking) {
      await this.sendPendingBookingNotifications(populatedBooking);
    }

    return {
      message: 'Service inquiry submitted successfully. We will contact you soon!',
      bookingId: booking._id,
      customerType: serviceInquiryDto.customerType,
      estimatedCost,
    };
  }

  /**
   * Create a new booking (Step 1: Pending status + emails)
   * Creates individual booking records for each day in the date range
   */
  async create(createBookingDto: CreateBookingDto, userId: string): Promise<Booking> {
    const startDate = new Date(createBookingDto.startDate);
    const endDate = new Date(createBookingDto.endDate);
    
    // Check for availability conflicts
    const conflicts = await this.checkAvailability(
      startDate,
      endDate,
      createBookingDto.sitterId
    );

    if (conflicts.length > 0) {
      throw new BadRequestException('Selected dates conflict with existing bookings');
    }

    // Calculate number of days in the range (inclusive)
    const daysDiff = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const bookingsToCreate = [];
    
    // Create a booking for each day in the range
    for (let i = 0; i < daysDiff; i++) {
      const currentDate = new Date(startDate.getTime() + (i * 24 * 60 * 60 * 1000));
      
      const timeDuration = endDate.getTime() - startDate.getTime();
      const timeDurationWithinDay = timeDuration % (1000 * 60 * 60 * 24);
      const currentEndDate = new Date(currentDate.getTime() + timeDurationWithinDay);
      
      const booking = new this.bookingModel({
        ...createBookingDto,
        userId: new Types.ObjectId(userId),
        createdBy: new Types.ObjectId(userId),
        sitterId: (createBookingDto.sitterId && createBookingDto.sitterId.trim() !== '') 
          ? new Types.ObjectId(createBookingDto.sitterId) 
          : undefined,
        startDate: currentDate,
        endDate: currentEndDate,
        status: 'pending',
        paymentStatus: 'pending',
      });
      
      bookingsToCreate.push(booking);
    }
    
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
        await this.sendPendingBookingNotifications(populatedBooking);
      }
    }
    
    // Return the first booking as reference
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
    const startDate = new Date(createBookingAdminDto.startDate);
    const endDate = new Date(createBookingAdminDto.endDate);
    
    // Check for availability conflicts
    const conflicts = await this.checkAvailability(
      startDate,
      endDate,
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

    // Calculate number of days in the range (inclusive)
    const daysDiff = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const bookingsToCreate = [];
    
    // Create a booking for each day in the range
    for (let i = 0; i < daysDiff; i++) {
      const currentDate = new Date(startDate.getTime() + (i * 24 * 60 * 60 * 1000));
      
      const timeDuration = endDate.getTime() - startDate.getTime();
      const timeDurationWithinDay = timeDuration % (1000 * 60 * 60 * 24);
      const currentEndDate = new Date(currentDate.getTime() + timeDurationWithinDay);
      
      const booking = new this.bookingModel({
        ...createBookingAdminDto,
        userId: new Types.ObjectId(createBookingAdminDto.userId),
        createdBy: new Types.ObjectId(adminUserId),
        sitterId: (createBookingAdminDto.sitterId && createBookingAdminDto.sitterId.trim() !== '') 
          ? new Types.ObjectId(createBookingAdminDto.sitterId) 
          : undefined,
        startDate: currentDate,
        endDate: currentEndDate,
        status: 'pending',
        paymentStatus: 'pending',
      });
      
      bookingsToCreate.push(booking);
    }
    
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
        await this.sendPendingBookingNotifications(populatedBooking);
      }
    }
    
    // Return the first booking as reference
    return savedBookings[0] as any;
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
      status: { $in: ['pending', 'confirmed', 'assigned', 'in_progress'] },
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
      console.error(`❌ Error details:`, error.message);
      console.error(`❌ Stack trace:`, error.stack);
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
    const booking = await this.bookingModel.findById(bookingId)
      .populate('userId', 'firstName lastName email phoneNumber address emergencyContact')
      .populate('sitterId', 'firstName lastName email')
      .exec();
    
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

    // Store original status for comparison
    const originalStatus = booking.status;

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
