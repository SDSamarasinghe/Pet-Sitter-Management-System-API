import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Body, 
  Param, 
  UseGuards, 
  Request,
  ForbiddenException,
  BadRequestException 
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { RolesGuard } from 'src/auth/roles.guard';
import { Roles } from 'src/auth/roles.decorator';
import { Types } from 'mongoose';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * Helper method to validate ObjectId
   */
  private isValidObjectId(id: string): boolean {
    return Types.ObjectId.isValid(id);
  }

  /**
   * POST /users - Register a new client
   * Public endpoint for user registration
   */
  @Post()
  async create(@Body() createUserDto: CreateUserDto) {
    const user = await this.usersService.create(createUserDto);
    // Remove password from response
    const { password, ...result } = user.toObject();
    return result;
  }

  /**
   * GET /users/profile - Get current user's profile
   * Protected: Get the authenticated user's own profile
   */
  @UseGuards(JwtAuthGuard)
  @Get('profile')
  async getProfile(@Request() req) {
    const currentUser = req.user;
    const user = await this.usersService.findById(currentUser.userId);
    // Remove password from response
    const { password, ...result } = user.toObject();
    return result;
  }

  /**
   * GET /users/admin/pending-addresses - Get all users with pending address changes
   * Admin only - This route must come before /:id route
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get('admin/pending-addresses')
  async getUsersWithPendingAddresses() {
    const users = await this.usersService.getUsersWithPendingAddresses();
    // Remove passwords from response
    return users.map(user => {
      const { password, ...result } = user.toObject();
      return result;
    });
  }

  /**
   * GET /users/:id - Get user profile by ID
   * Protected: User can view own profile, admin can view any profile
   */
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req) {
    // Validate ObjectId format
    if (!this.isValidObjectId(id)) {
      throw new BadRequestException('Invalid user ID format');
    }

    const currentUser = req.user;
    
    // Allow users to view their own profile or admins to view any profile
    if (id !== currentUser.userId && currentUser.role !== 'admin') {
      throw new ForbiddenException('You can only view your own profile');
    }

    const user = await this.usersService.findById(id);
    // Remove password from response
    const { password, ...result } = user.toObject();
    return result;
  }

  /**
   * PUT /users/:id - Update user profile
   * Protected: Users can update own profile, admins can update any profile
   */
  @UseGuards(JwtAuthGuard)
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @Request() req
  ) {
    // Validate ObjectId format
    if (!this.isValidObjectId(id)) {
      throw new BadRequestException('Invalid user ID format');
    }

    const currentUser = req.user;
    
    const user = await this.usersService.update(
      id,
      updateUserDto,
      currentUser.userId,
      currentUser.role
    );
    
    // Remove password from response
    const { password, ...result } = user.toObject();
    return result;
  }

  /**
   * PUT /users/:id/approve-address - Approve pending address change
   * Admin only
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Put(':id/approve-address')
  async approvePendingAddress(@Param('id') id: string) {
    // Validate ObjectId format
    if (!this.isValidObjectId(id)) {
      throw new BadRequestException('Invalid user ID format');
    }

    const user = await this.usersService.approvePendingAddress(id);
    const { password, ...result } = user.toObject();
    return result;
  }

  /**
   * PUT /users/:id/reject-address - Reject pending address change
   * Admin only
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Put(':id/reject-address')
  async rejectPendingAddress(@Param('id') id: string) {
    // Validate ObjectId format
    if (!this.isValidObjectId(id)) {
      throw new BadRequestException('Invalid user ID format');
    }

    const user = await this.usersService.rejectPendingAddress(id);
    const { password, ...result } = user.toObject();
    return result;
  }
}
