import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { MailerService } from '@nestjs-modules/mailer';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User, UserDocument } from './schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private mailerService: MailerService,
  ) {}

  /**
   * Find all sitters (Admin only)
   * Returns all users with role 'sitter' regardless of status
   */
  async findAllSitters(): Promise<UserDocument[]> {
    return this.userModel
      .find({ role: 'sitter' })
      .select('-password') // Exclude password from results
      .exec();
  }

  /**
   * Find all clients (Admin only)
   * Returns all users with role 'client' regardless of status
   */
  async findAllClients(): Promise<UserDocument[]> {
    return this.userModel
      .find({ role: 'client' })
      .select('-password') // Exclude password from results
      .exec();
  }

  /**
   * Create a new user with hashed password
   */
  async create(createUserDto: CreateUserDto): Promise<UserDocument> {
    let hashedPassword = null;
    
    // Hash password if provided (for direct registration)
    if (createUserDto.password) {
      const saltRounds = 10;
      hashedPassword = await bcrypt.hash(createUserDto.password, saltRounds);
    }
    
    const newUser = new this.userModel({
      ...createUserDto,
      password: hashedPassword,
      role: createUserDto.role || 'client', // Default to client role
      status: 'pending', // Default status is pending for approval
    });
    
    const savedUser = await newUser.save();

    // Send notification email to admin
    try {
      await this.mailerService.sendMail({
        to: process.env.ADMIN_EMAIL || 'admin@flyingduchess.com',
        subject: 'New User Registration - Approval Required',
        template: 'admin-notification',
        context: {
          userName: `${savedUser.firstName} ${savedUser.lastName}`,
          userEmail: savedUser.email,
          userRole: savedUser.role,
          userPhone: savedUser.phoneNumber,
        },
      });
    } catch (error) {
      console.error('Failed to send admin notification email:', error);
      // Don't fail user creation if email fails
    }
    
    return savedUser;
  }

  /**
   * Find user by email for authentication
   */
  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email }).exec();
  }

  /**
   * Find user by ID
   */
  async findById(id: string): Promise<UserDocument> {
    const user = await this.userModel.findById(id).exec();
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  /**
   * Update user profile with role-based restrictions
   */
  async update(
    id: string, 
    updateUserDto: UpdateUserDto, 
    currentUserId: string, 
    currentUserRole: string
  ): Promise<UserDocument> {
    const user = await this.findById(id);
    
    // Only allow users to update their own profile or admins to update any profile
    if (id !== currentUserId && currentUserRole !== 'admin') {
      throw new ForbiddenException('You can only update your own profile');
    }

    // Handle address updates with RBAC
    const updateData: any = { ...updateUserDto };
    
    if (updateUserDto.pendingAddress) {
      if (currentUserRole === 'client') {
        // Clients can only request address changes (stored in pendingAddress)
        updateData.pendingAddress = updateUserDto.pendingAddress;
        delete updateData.address; // Remove direct address update
      } else if (currentUserRole === 'admin') {
        // Admins can directly update address
        updateData.address = updateUserDto.pendingAddress;
        updateData.pendingAddress = null; // Clear pending request
      }
    }

    // Only allow admins to directly update address
    if (updateUserDto.address && currentUserRole !== 'admin') {
      delete updateData.address;
    }

    const updatedUser = await this.userModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .exec();
      
    if (!updatedUser) {
      throw new NotFoundException('User not found');
    }
    
    return updatedUser;
  }

  /**
   * Admin: Approve pending address change
   */
  async approvePendingAddress(userId: string): Promise<UserDocument> {
    const user = await this.findById(userId);
    
    if (!user.pendingAddress) {
      throw new ForbiddenException('No pending address change found');
    }

    const updatedUser = await this.userModel
      .findByIdAndUpdate(
        userId,
        { 
          address: user.pendingAddress,
          pendingAddress: null 
        },
        { new: true }
      )
      .exec();

    return updatedUser;
  }

  /**
   * Admin: Reject pending address change
   */
  async rejectPendingAddress(userId: string): Promise<UserDocument> {
    const updatedUser = await this.userModel
      .findByIdAndUpdate(
        userId,
        { pendingAddress: null },
        { new: true }
      )
      .exec();

    if (!updatedUser) {
      throw new NotFoundException('User not found');
    }

    return updatedUser;
  }

  /**
   * Get all users with pending address changes (Admin only)
   */
  async getUsersWithPendingAddresses(): Promise<UserDocument[]> {
    return this.userModel
      .find({ pendingAddress: { $ne: null } })
      .exec();
  }

  /**
   * Find all pending users (Admin only)
   */
  async findPendingUsers(): Promise<UserDocument[]> {
    return this.userModel
      .find({ status: 'pending' })
      .select('-password') // Exclude password from results
      .exec();
  }

  /**
   * Approve a user and set their password (Admin only)
   */
  async approveUser(userId: string, password: string): Promise<UserDocument> {
    const user = await this.findById(userId);
    
    if (user.status !== 'pending') {
      throw new ForbiddenException('User is not in pending status');
    }

    // Hash the new password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const updatedUser = await this.userModel
      .findByIdAndUpdate(
        userId,
        { 
          status: 'active',
          password: hashedPassword 
        },
        { new: true }
      )
      .exec();

    if (!updatedUser) {
      throw new NotFoundException('User not found');
    }

    // Send approval notification email to user
    try {
      await this.mailerService.sendMail({
        to: updatedUser.email,
        subject: 'Account Approved - Welcome to Flying Duchess Pet-Sitting',
        template: 'sitter-approved',
        context: {
          userName: `${updatedUser.firstName} ${updatedUser.lastName}`,
          userEmail: updatedUser.email,
          password: password, // Send the plain password in email
          loginUrl: process.env.FRONTEND_URL || 'https://flyingduchess.com/login',
        },
      });
    } catch (error) {
      console.error('Failed to send approval notification email:', error);
      // Don't fail approval if email fails
    }

    return updatedUser;
  }

  /**
   * Reject a user (Admin only)
   */
  async rejectUser(userId: string): Promise<UserDocument> {
    const user = await this.findById(userId);
    
    if (user.status !== 'pending') {
      throw new ForbiddenException('User is not in pending status');
    }

    const updatedUser = await this.userModel
      .findByIdAndUpdate(
        userId,
        { status: 'rejected' },
        { new: true }
      )
      .exec();

    if (!updatedUser) {
      throw new NotFoundException('User not found');
    }

    // Send rejection notification email to user
    try {
      await this.mailerService.sendMail({
        to: updatedUser.email,
        subject: 'Application Status Update - Flying Duchess Pet-Sitting',
        template: 'user-rejected',
        context: {
          userName: `${updatedUser.firstName} ${updatedUser.lastName}`,
          supportEmail: process.env.SUPPORT_EMAIL || 'support@flyingduchess.com',
        },
      });
    } catch (error) {
      console.error('Failed to send rejection notification email:', error);
      // Don't fail rejection if email fails
    }

    return updatedUser;
  }
}
