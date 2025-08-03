import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete, 
  Body, 
  Param, 
  UseGuards, 
  Request 
} from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
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
   * Public endpoint for the Flying Duchess service inquiry form
   */
  @Post('service-inquiry')
  async submitServiceInquiry(@Body() serviceInquiryDto: ServiceInquiryDto) {
    return this.bookingsService.submitServiceInquiry(serviceInquiryDto);
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
   * GET /bookings/user/:userId - Get user's bookings
   * Users can view their own bookings, admins can view any user's bookings
   */
  @UseGuards(JwtAuthGuard)
  @Get('user/:userId')
  async findByUserId(@Param('userId') userId: string, @Request() req) {
    const currentUser = req.user;
    
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
    const currentUser = req.user;
    await this.bookingsService.delete(id, currentUser.userId, currentUser.role);
    return { message: 'Booking deleted successfully' };
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
    return this.bookingsService.assignSitter(id, sitterId);
  }
}
