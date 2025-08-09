import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { KeySecurity, KeySecurityDocument } from './schemas/key-security.schema';
import { CreateKeySecurityDto, UpdateKeySecurityDto } from './dto/key-security.dto';

@Injectable()
export class KeySecurityService {
  constructor(
    @InjectModel(KeySecurity.name) private keySecurityModel: Model<KeySecurityDocument>,
  ) {}

  /**
   * Create or update key security info for a client
   */
  async createOrUpdate(
    createKeySecurityDto: CreateKeySecurityDto,
    clientId: string,
    currentUserId: string,
    currentUserRole: string
  ): Promise<KeySecurityDocument> {
    // Only client themselves or admin can manage key security
    if (clientId !== currentUserId && currentUserRole !== 'admin') {
      throw new ForbiddenException('You can only manage your own key security information');
    }

    const existing = await this.keySecurityModel.findOne({ 
      clientId: new Types.ObjectId(clientId) 
    });

    if (existing) {
      return this.keySecurityModel.findByIdAndUpdate(
        existing._id,
        { ...createKeySecurityDto, updatedAt: new Date() },
        { new: true }
      );
    }

    const keySecurity = new this.keySecurityModel({
      ...createKeySecurityDto,
      clientId: new Types.ObjectId(clientId),
    });

    return keySecurity.save();
  }

  /**
   * Get key security info for a client
   */
  async getByClientId(
    clientId: string,
    currentUserId: string,
    currentUserRole: string
  ): Promise<KeySecurityDocument> {
    // Only client themselves, admin, or assigned sitters can view
    if (clientId !== currentUserId && currentUserRole !== 'admin' && currentUserRole !== 'sitter') {
      throw new ForbiddenException('Access denied');
    }

    const keySecurity = await this.keySecurityModel
      .findOne({ clientId: new Types.ObjectId(clientId) })
      .populate('clientId', 'firstName lastName email address');

    if (!keySecurity) {
      throw new NotFoundException('Key security information not found');
    }

    return keySecurity;
  }

  /**
   * Update key security info
   */
  async update(
    id: string,
    updateKeySecurityDto: UpdateKeySecurityDto,
    currentUserId: string,
    currentUserRole: string
  ): Promise<KeySecurityDocument> {
    const keySecurity = await this.keySecurityModel.findById(id);
    if (!keySecurity) {
      throw new NotFoundException('Key security information not found');
    }

    // Only client themselves or admin can update
    if (keySecurity.clientId.toString() !== currentUserId && currentUserRole !== 'admin') {
      throw new ForbiddenException('You can only update your own key security information');
    }

    return this.keySecurityModel.findByIdAndUpdate(
      id,
      { ...updateKeySecurityDto, updatedAt: new Date() },
      { new: true }
    );
  }

  /**
   * Delete key security info
   */
  async delete(
    id: string,
    currentUserId: string,
    currentUserRole: string
  ): Promise<void> {
    const keySecurity = await this.keySecurityModel.findById(id);
    if (!keySecurity) {
      throw new NotFoundException('Key security information not found');
    }

    // Only client themselves or admin can delete
    if (keySecurity.clientId.toString() !== currentUserId && currentUserRole !== 'admin') {
      throw new ForbiddenException('You can only delete your own key security information');
    }

    await this.keySecurityModel.findByIdAndDelete(id);
  }

  /**
   * Get all key security info (admin only)
   */
  async getAllForAdmin(): Promise<KeySecurityDocument[]> {
    return this.keySecurityModel
      .find()
      .populate('clientId', 'firstName lastName email address phoneNumber')
      .sort({ updatedAt: -1 });
  }
}
