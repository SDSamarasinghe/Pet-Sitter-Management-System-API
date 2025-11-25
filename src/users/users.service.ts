import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { MailerService } from '@nestjs-modules/mailer';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User, UserDocument } from './schemas/user.schema';
import { Pet, PetDocument } from '../pets/schemas/pet.schema';
import { PetCare, PetCareDocument } from '../pets/schemas/pet-care.schema';
import { PetMedical, PetMedicalDocument } from '../pets/schemas/pet-medical.schema';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AzureBlobService } from '../azure-blob/azure-blob.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Pet.name) private petModel: Model<PetDocument>,
    @InjectModel(PetCare.name) private petCareModel: Model<PetCareDocument>,
    @InjectModel(PetMedical.name) private petMedicalModel: Model<PetMedicalDocument>,
    private mailerService: MailerService,
    private azureBlobService: AzureBlobService,
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

  async findAllClientsWithPets(): Promise<UserDocument[]> {
    // Get all clients first
    const clients = await this.userModel
      .find({ role: 'client' })
      .select('-password')
      .exec();
    
    // Manually populate pets for each client using comprehensive query
    // This matches the same logic used in pets.service.ts findByUserId method
    for (const client of clients) {
      const clientIdString = client._id.toString();
      const clientObjectId = client._id;
      
      const pets = await this.petModel.find({
        $or: [
          { userId: clientIdString }, // Match as string (for legacy data)
          { userId: clientObjectId }, // Match as ObjectId (proper format)
          { 'userId._id': clientIdString }, // Match when userId is populated as object with string _id
          { 'userId._id': clientObjectId } // Match when userId is populated as ObjectId
        ]
      }).exec();
      
      // For each pet, fetch and attach medical and care data
      const petsWithDetails = await Promise.all(
        pets.map(async (pet) => {
          const petIdString = pet._id.toString(); // Convert ObjectId to string for querying
          
          const [careData, medicalData] = await Promise.all([
            this.petCareModel.findOne({ petId: petIdString }).exec(),
            this.petMedicalModel.findOne({ petId: petIdString }).exec()
          ]);

          return {
            ...pet.toObject(),
            careData: careData || null,
            medicalData: medicalData || null
          };
        })
      );
      
      (client as any).pets = petsWithDetails;
    }
    
    return clients;
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
        subject: 'Account Approved - Welcome to Whiskarz Pet-Sitting',
        template: 'sitter-approved',
        context: {
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName,
          email: updatedUser.email,
          role: updatedUser.role,
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
        subject: 'Application Status Update - Whiskarz Pet-Sitting',
        template: 'user-rejected',
        context: {
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName,
          email: updatedUser.email,
          role: updatedUser.role,
          reason: 'Your application did not meet our requirements at this time.',
          supportEmail: process.env.SUPPORT_EMAIL || 'support@flyingduchess.com',
        },
      });
    } catch (error) {
      console.error('Failed to send rejection notification email:', error);
      // Don't fail rejection if email fails
    }

    return updatedUser;
  }

  /**
   * Update user's profile picture
   */
  async updateProfilePicture(userId: string, file: Express.Multer.File): Promise<UserDocument> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Validate file type
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('Only image files are allowed (JPEG, PNG, GIF, WebP)');
    }

    // Validate file size (5MB limit)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      throw new BadRequestException('File size must be less than 5MB');
    }

    try {
      // Upload new profile picture
      const fileName = this.azureBlobService.generateFileName(file.originalname, 'profile');
      const profilePictureUrl = await this.azureBlobService.uploadFile(file, fileName);

      // If user already has a profile picture, we could delete the old one here
      // For now, we'll just update with the new URL
      
      const updatedUser = await this.userModel.findByIdAndUpdate(
        userId,
        { profilePicture: profilePictureUrl },
        { new: true, runValidators: true }
      );

      if (!updatedUser) {
        throw new NotFoundException('User not found');
      }

      return updatedUser;
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(`Upload failed: ${error.message}`);
    }
  }

  /**
   * Remove user's profile picture
   */
  async removeProfilePicture(userId: string): Promise<UserDocument> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // If user has no profile picture, nothing to remove
    if (!user.profilePicture) {
      return user;
    }

    // Remove profile picture URL from user document
    const updatedUser = await this.userModel.findByIdAndUpdate(
      userId,
      { $unset: { profilePicture: 1 } },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      throw new NotFoundException('User not found');
    }

    return updatedUser;
  }

  /**
   * Generate password reset token for user
   */
  async generatePasswordResetToken(email: string): Promise<string> {
    const user = await this.userModel.findOne({ email });
    
    if (!user) {
      throw new NotFoundException('User with this email not found');
    }

    // Generate a secure random token
    const crypto = require('crypto');
    const token = crypto.randomBytes(32).toString('hex');
    
    // Set token and expiration (1 hour from now)
    const expires = new Date();
    expires.setHours(expires.getHours() + 1);

    await this.userModel.findByIdAndUpdate(user._id, {
      passwordResetToken: token,
      passwordResetExpires: expires,
    });

    return token;
  }

  /**
   * Reset password using token
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    const user = await this.userModel.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: new Date() }, // Token not expired
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired password reset token');
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password and clear reset token
    await this.userModel.findByIdAndUpdate(user._id, {
      password: hashedPassword,
      $unset: {
        passwordResetToken: 1,
        passwordResetExpires: 1,
      },
    });
  }

  /**
   * Update firstTimeLogin flag to false after first login
   */
  async updateFirstTimeLogin(userId: string): Promise<void> {
    await this.userModel.findByIdAndUpdate(userId, {
      firstTimeLogin: false,
    });
  }

  /**
   * Delete user (Admin only)
   * Removes user and all associated data (pets, pet care, pet medical)
   */
  async deleteUser(userId: string): Promise<{ message: string; deletedUser: any }> {
    // Find the user first
    const user = await this.userModel.findById(userId);
    
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Get user role and name for the response message
    const userRole = user.role;
    const userName = `${user.firstName} ${user.lastName}`;

    // If user is a client, delete all associated pets and their data
    if (user.role === 'client') {
      // Find all pets belonging to this user
      const pets = await this.petModel.find({ userId: userId });
      
      // Delete pet care and medical records for each pet
      for (const pet of pets) {
        const petIdString = pet._id.toString();
        await this.petCareModel.deleteMany({ petId: petIdString });
        await this.petMedicalModel.deleteMany({ petId: petIdString });
      }
      
      // Delete all pets
      await this.petModel.deleteMany({ userId: userId });
      
      console.log(`🗑️ Deleted ${pets.length} pets and their associated data for client ${userName}`);
    }

    // Delete the user
    await this.userModel.findByIdAndDelete(userId);

    console.log(`✅ Successfully deleted ${userRole}: ${userName} (ID: ${userId})`);

    return {
      message: `${userRole.charAt(0).toUpperCase() + userRole.slice(1)} "${userName}" has been successfully removed from the system`,
      deletedUser: {
        id: userId,
        name: userName,
        email: user.email,
        role: userRole,
      }
    };
  }
}
