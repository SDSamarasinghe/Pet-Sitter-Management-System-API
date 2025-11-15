import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete, 
  Body, 
  Param, 
  Query,
  UseGuards, 
  Request,
  BadRequestException
} from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { CreateBookingAdminDto } from './dto/create-booking-admin.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { ServiceInquiryDto } from './dto/service-inquiry.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  /**
   * POST /bookings/service-inquiry - Submit service inquiry (public endpoint)
   * Public endpoint for the Whiskarz service inquiry form
   */
  @Post('service-inquiry')
  async submitServiceInquiry(@Body() serviceInquiryDto: ServiceInquiryDto) {
    return this.bookingsService.submitServiceInquiry(serviceInquiryDto);
  }

  /**
   * GET /bookings/availability - Check availability for dates
   */
  @Get('availability')
  async checkAvailability(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('sitterId') sitterId?: string
  ) {
    // Handle empty string sitterId
    const validSitterId = sitterId && sitterId.trim() !== '' ? sitterId : undefined;
    
    return this.bookingsService.checkAvailability(
      new Date(startDate),
      new Date(endDate),
      validSitterId
    );
  }

  /**
   * GET /bookings/available-sitters - Get available sitters for dates
   */
  @Get('available-sitters')
  async getAvailableSitters(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('serviceType') serviceType?: string,
    @Query('petTypes') petTypes?: string
  ) {
    const petTypesArray = petTypes ? petTypes.split(',') : undefined;
    return this.bookingsService.getAvailableSitters(
      startDate,
      endDate,
      serviceType,
      petTypesArray
    );
  }

  /**
   * POST /bookings - Create a new booking
   * Authenticated users can create bookings
   */
  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@Body() createBookingDto: CreateBookingDto, @Request() req) {
    const currentUser = req.user;
    return this.bookingsService.create(createBookingDto, currentUser.userId);
  }

  /**
   * POST /bookings/admin - Create a new booking by admin on behalf of client
   * Admin can create bookings for any client
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post('admin')
  async createByAdmin(
    @Body() createBookingAdminDto: CreateBookingAdminDto, 
    @Request() req
  ) {
    const currentUser = req.user;
    return this.bookingsService.createByAdmin(createBookingAdminDto, currentUser.userId);
  }

  /**
   * GET /bookings/client/:clientId/history - Get client's booking history
   */
  @UseGuards(JwtAuthGuard)
  @Get('client/:clientId/history')
  async getClientBookingHistory(
    @Param('clientId') clientId: string,
    @Request() req,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @Query('status') status?: string
  ) {
    // Validate clientId parameter
    if (!clientId || clientId.trim() === '') {
      throw new BadRequestException('Client ID is required');
    }
    
    return this.bookingsService.getClientBookingHistory(
      clientId,
      req.user.userId,
      req.user.role,
      parseInt(page),
      parseInt(limit),
      status
    );
  }

  /**
   * POST /bookings/:id/visit-log - Add visit log to booking
   */
  @UseGuards(JwtAuthGuard)
  @Post(':id/visit-log')
  async addVisitLog(
    @Param('id') id: string,
    @Body() visitData: {
      date: string;
      notes: string;
      photos?: string[];
      duration?: number;
      activities?: string[];
    },
    @Request() req
  ) {
    // Validate booking ID parameter
    if (!id || id.trim() === '') {
      throw new BadRequestException('Booking ID is required');
    }
    
    return this.bookingsService.addVisitLog(
      id,
      {
        ...visitData,
        date: new Date(visitData.date),
      },
      req.user.userId,
      req.user.role
    );
  }

  /**
   * POST /bookings/:id/notes - Add notes to booking
   */
  @UseGuards(JwtAuthGuard)
  @Post(':id/notes')
  async addNotes(
    @Param('id') id: string,
    @Body() noteData: {
      notes: string;
      noteType: 'client' | 'sitter' | 'admin';
    },
    @Request() req
  ) {
    // Validate booking ID parameter
    if (!id || id.trim() === '') {
      throw new BadRequestException('Booking ID is required');
    }
    
    return this.bookingsService.addNotes(
      id,
      noteData.notes,
      noteData.noteType,
      req.user.userId,
      req.user.role
    );
  }

    /**
   * PUT /bookings/:id/payment-status - Update payment status (admin only)
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Put(':id/payment-status')
  async updatePaymentStatus(
    @Param('id') id: string,
    @Body() body: { paymentStatus: string }
  ) {
    if (!id || id.trim() === '') {
      throw new BadRequestException('Booking ID is required');
    }
    if (!body.paymentStatus) {
      throw new BadRequestException('paymentStatus is required');
    }
    return this.bookingsService.updatePaymentStatus(id, body.paymentStatus);
  }

  /**
   * GET /bookings/stats/:clientId? - Get booking statistics
   */
  @UseGuards(JwtAuthGuard)
  @Get('stats/:clientId?')
  async getBookingStats(
    @Param('clientId') clientId: string,
    @Request() req
  ) {
    // Handle empty string or undefined clientId
    if (!clientId || clientId.trim() === '') {
      clientId = undefined;
    }
    
    // If clientId provided and user is not admin, verify it's their own stats
    if (clientId && clientId !== req.user.userId && req.user.role !== 'admin') {
      clientId = req.user.userId;
    }
    
    return this.bookingsService.getBookingStats(clientId);
  }

  /**
   * GET /bookings/user/:userId/assigned-sitters - Get assigned sitters for a specific user/client
   * Users can view their own assigned sitters, admins can view any user's assigned sitters
   */
  @UseGuards(JwtAuthGuard)
  @Get('user/:userId/assigned-sitters')
  async getAssignedSitters(@Param('userId') userId: string, @Request() req) {
    const currentUser = req.user;
    
    // Validate userId parameter
    if (!userId || userId.trim() === '') {
      throw new BadRequestException('User ID is required');
    }
    
    return this.bookingsService.getAssignedSitters(
      userId,
      currentUser.userId,
      currentUser.role
    );
  }

  /**
   * GET /bookings/user/:userId - Get user's bookings
   * Users can view their own bookings, admins can view any user's bookings
   */
  @UseGuards(JwtAuthGuard)
  @Get('user/:userId')
  async findByUserId(@Param('userId') userId: string, @Request() req) {
    const currentUser = req.user;
    
    // Validate userId parameter
    if (!userId || userId.trim() === '') {
      throw new BadRequestException('User ID is required');
    }
    
    // Users can only view their own bookings unless they are admin
    if (userId !== currentUser.userId && currentUser.role !== 'admin') {
      userId = currentUser.userId; // Override to current user's ID
    }
    
    return this.bookingsService.findByUserId(userId);
  }

  /**
   * GET /bookings/sitter/:sitterId - Get sitter's assigned bookings
   * Sitters can view their assigned bookings, admins can view any sitter's bookings
   */
  @UseGuards(JwtAuthGuard)
  @Get('sitter/:sitterId')
  async findBySitterId(@Param('sitterId') sitterId: string, @Request() req) {
    const currentUser = req.user;
    
    // Validate sitterId parameter
    if (!sitterId || sitterId.trim() === '') {
      throw new BadRequestException('Sitter ID is required');
    }
    
    // Sitters can only view their own assigned bookings unless they are admin
    if (sitterId !== currentUser.userId && currentUser.role !== 'admin') {
      sitterId = currentUser.userId; // Override to current user's ID
    }
    
    return this.bookingsService.findBySitterId(sitterId);
  }

  /**
   * GET /bookings - Get all bookings (admin only)
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get()
  async findAll() {
    return this.bookingsService.findAll();
  }

  /**
   * GET /bookings/:id - Get booking by ID
   * Users can view their own bookings or assigned bookings
   */
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async findById(@Param('id') id: string, @Request() req) {
    // Validate booking ID parameter
    if (!id || id.trim() === '') {
      throw new BadRequestException('Booking ID is required');
    }
    
    const currentUser = req.user;
    return this.bookingsService.findById(id, currentUser.userId, currentUser.role);
  }

  /**
   * PUT /bookings/:id - Update booking
   * Users can update their own bookings, admins can update any booking
   */
  @UseGuards(JwtAuthGuard)
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateBookingDto: UpdateBookingDto,
    @Request() req
  ) {
    console.log("🚀 ~ BookingsController ~ update ~ updateBookingDto:", updateBookingDto)
    // Validate booking ID parameter
    if (!id || id.trim() === '') {
      throw new BadRequestException('Booking ID is required');
    }
    
    const currentUser = req.user;
    return this.bookingsService.update(id, updateBookingDto, currentUser.userId, currentUser.role);
  }

  /**
   * DELETE /bookings/:id - Delete booking
   * Users can delete their own bookings, admins can delete any booking
   */
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async delete(@Param('id') id: string, @Request() req) {
    // Validate booking ID parameter
    if (!id || id.trim() === '') {
      throw new BadRequestException('Booking ID is required');
    }
    
    const currentUser = req.user;
    await this.bookingsService.delete(id, currentUser.userId, currentUser.role);
    return { message: 'Booking deleted successfully' };
  }


  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Delete('admin/:id')
  async adminDelete(@Param('id') id: string, @Request() req) {
    if (!id || id.trim() === '') {
      throw new BadRequestException('Booking ID is required');
    }
    await this.bookingsService.deleteByAdmin(id);
    return { message: 'Booking deleted by admin successfully' };
  }

  /**
   * PUT /bookings/:id/assign-sitter - Assign sitter to booking (admin only)
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Put(':id/assign-sitter')
  async assignSitter(
    @Param('id') id: string,
    @Body('sitterId') sitterId: string
  ) {
    // Validate booking ID parameter
    if (!id || id.trim() === '') {
      throw new BadRequestException('Booking ID is required');
    }
    
    // Validate sitter ID parameter
    if (!sitterId || sitterId.trim() === '') {
      throw new BadRequestException('Sitter ID is required');
    }
    
    return this.bookingsService.assignSitter(id, sitterId);
  }

  /**
   * DELETE /bookings/:id/assign-sitter - Unassign sitter from booking (admin only)
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Delete(':id/assign-sitter')
  async unassignSitter(@Param('id') id: string) {
    // Validate booking ID parameter
    if (!id || id.trim() === '') {
      throw new BadRequestException('Booking ID is required');
    }
    return this.bookingsService.unassignSitter(id);
  }
}
