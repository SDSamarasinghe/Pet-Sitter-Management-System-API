import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User, UserDocument } from './schemas/user.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  /**
   * Create a new user with hashed password
   */
  async create(createUserDto: CreateUserDto): Promise<UserDocument> {
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(createUserDto.password, saltRounds);
    
    const newUser = new this.userModel({
      ...createUserDto,
      password: hashedPassword,
      role: createUserDto.role || 'client', // Default to client role
    });
    
    return newUser.save();
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
}
