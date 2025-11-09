import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete,
  Body, 
  Param, 
  UseGuards, 
  Request,
  ForbiddenException,
  BadRequestException,
  UseInterceptors,
  UploadedFile
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ApproveUserDto } from './dto/approve-user.dto';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { RolesGuard } from 'src/auth/roles.guard';
import { Roles } from 'src/auth/roles.decorator';
import { Types } from 'mongoose';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  /**
   * GET /users/admin/sitters - Get all sitters with status (admin only)
   * Returns all users with role 'sitter' and their status
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get('admin/sitters')
  async getAllSitters() {
    const sitters = await this.usersService.findAllSitters();
    // Remove passwords from response
    return sitters.map(user => {
      const { password, ...result } = user.toObject();
      return result;
    });
  }

  /**
   * GET /users/admin/clients - Get all clients with status (admin only)
   * Returns all users with role 'client' and their status
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'sitter')
  @Get('admin/clients')
  async getAllClients() {
    const clients = await this.usersService.findAllClients();
    // Remove passwords from response
    return clients.map(user => {
      const { password, ...result } = user.toObject();
      return result;
    });
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'sitter')
  @Get('admin/clients-with-pets')
  async findAllClientsWithPets() {
    const clients = await this.usersService.findAllClientsWithPets();
    // Remove passwords from response and return with pets
    return clients.map(user => {
      const userObj = user.toObject({ virtuals: true });
      const { password, ...result } = userObj;
      return result;
    });
  }

  /**
   * Helper method to validate ObjectId
   */
  private isValidObjectId(id: string): boolean {
    return Types.ObjectId.isValid(id);
  }

  /**
   * POST /users - Register a new user
   * Public endpoint for user registration (creates pending users)
   */
  @Post()
  async create(@Body() createUserDto: CreateUserDto) {
    const user = await this.usersService.create(createUserDto);
    // Remove password from response
    const { password, ...result } = user.toObject();
    return result;
  }

  /**
   * GET /users/pending - Get all pending users (admin only)
   * Protected: Only admins can view pending users
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get('pending')
  async getPendingUsers() {
    return this.usersService.findPendingUsers();
  }

  /**
   * PUT /users/:id/approve - Approve a pending user (admin only)
   * Protected: Only admins can approve users
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Put(':id/approve')
  async approveUser(@Param('id') id: string, @Body() approveUserDto: ApproveUserDto) {
    // Validate ObjectId format
    if (!this.isValidObjectId(id)) {
      throw new BadRequestException('Invalid user ID format');
    }

    if (approveUserDto.password !== approveUserDto.confirmPassword) {
      throw new BadRequestException('Passwords do not match');
    }

    return this.usersService.approveUser(id, approveUserDto.password);
  }

  /**
   * PUT /users/:id/reject - Reject a pending user (admin only)
   * Protected: Only admins can reject users
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Put(':id/reject')
  async rejectUser(@Param('id') id: string) {
    // Validate ObjectId format
    if (!this.isValidObjectId(id)) {
      throw new BadRequestException('Invalid user ID format');
    }

    return this.usersService.rejectUser(id);
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
   * PUT /users/profile - Update current user's profile
   * Protected: Update the authenticated user's own profile
   */
  @UseGuards(JwtAuthGuard)
  @Put('profile')
  async updateProfile(
    @Body() updateUserDto: UpdateUserDto,
    @Request() req
  ) {
    const currentUser = req.user;
    
    const user = await this.usersService.update(
      currentUser.userId,
      updateUserDto,
      currentUser.userId,
      currentUser.role
    );
    
    // Remove password from response
    const { password, ...result } = user.toObject();
    return result;
  }

  /**
   * POST /users/profile/picture - Upload profile picture
   * Protected: Update the authenticated user's profile picture
   */
  @UseGuards(JwtAuthGuard)
  @Post('profile/picture')
  @UseInterceptors(FileInterceptor('profilePicture'))
  async uploadProfilePicture(
    @UploadedFile() file: Express.Multer.File,
    @Request() req
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const currentUser = req.user;
    const user = await this.usersService.updateProfilePicture(currentUser.userId, file);
    
    // Remove password from response
    const { password, ...result } = user.toObject();
    return {
      ...result,
      profilePicture: user.profilePicture
    };
  }

  /**
   * DELETE /users/profile/picture - Remove profile picture
   * Protected: Remove the authenticated user's profile picture
   */
  @UseGuards(JwtAuthGuard)
  @Delete('profile/picture')
  async removeProfilePicture(@Request() req) {
    const currentUser = req.user;
    const user = await this.usersService.removeProfilePicture(currentUser.userId);
    
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
   * GET /users/:id - Get user profile by ID (admin only)
   * Protected: Only admins can view user profiles by ID
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get(':id')
  async findOne(@Param('id') id: string) {
    // Validate ObjectId format
    if (!this.isValidObjectId(id)) {
      throw new BadRequestException('Invalid user ID format');
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

  /**
   * DELETE /users/sitters/:id - Delete a sitter from the system (admin only)
   * Protected: Only admins can delete sitters
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Delete('sitters/:id')
  async deleteSitter(@Param('id') id: string) {
    // Validate ObjectId format
    if (!this.isValidObjectId(id)) {
      throw new BadRequestException('Invalid user ID format');
    }

    // Verify the user is actually a sitter
    const user = await this.usersService.findById(id);
    if (user.role !== 'sitter') {
      throw new BadRequestException('User is not a sitter');
    }

    return this.usersService.deleteUser(id);
  }

  /**
   * DELETE /users/clients/:id - Delete a client from the system (admin only)
   * Protected: Only admins can delete clients
   * This will also delete all associated pets and their data
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Delete('clients/:id')
  async deleteClient(@Param('id') id: string) {
    // Validate ObjectId format
    if (!this.isValidObjectId(id)) {
      throw new BadRequestException('Invalid user ID format');
    }

    // Verify the user is actually a client
    const user = await this.usersService.findById(id);
    if (user.role !== 'client') {
      throw new BadRequestException('User is not a client');
    }

    return this.usersService.deleteUser(id);
  }
}
