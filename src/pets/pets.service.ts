import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Pet, PetDocument } from './schemas/pet.schema';
import { CreatePetDto } from './dto/create-pet.dto';

@Injectable()
export class PetsService {
  /**
   * Get all pets (admin only)
   */
  async findAll(): Promise<Pet[]> {
    return this.petModel.find().populate('userId', 'email').exec();
  }
  constructor(
    @InjectModel(Pet.name) private petModel: Model<PetDocument>,
  ) {}

  /**
   * Create a new pet for a user
   */
  async create(createPetDto: CreatePetDto, userId: string): Promise<Pet> {
    const newPet = new this.petModel({
      ...createPetDto,
      userId,
    });
    
    return newPet.save();
  }

  /**
   * Get all pets for a specific user
   */
  async findByUserId(userId: string): Promise<Pet[]> {
    return this.petModel
      .find({ userId })
      .populate('userId', 'email') // Optional: populate user email
      .exec();
  }

  /**
   * Get pet by ID with ownership verification
   */
  async findById(petId: string, currentUserId: string, currentUserRole: string): Promise<Pet> {
    const pet = await this.petModel
      .findById(petId)
      .populate('userId', 'email')
      .exec();
      
    if (!pet) {
      throw new NotFoundException('Pet not found');
    }

    // Only allow pet owner or admin to view pet details
    if (pet.userId.toString() !== currentUserId && currentUserRole !== 'admin') {
      throw new ForbiddenException('You can only view your own pets');
    }

    return pet;
  }

  /**
   * Update pet information
   */
  async update(
    petId: string, 
    updateData: Partial<CreatePetDto>, 
    currentUserId: string, 
    currentUserRole: string
  ): Promise<Pet> {
    const pet = await this.petModel.findById(petId).exec();
    
    if (!pet) {
      throw new NotFoundException('Pet not found');
    }

    // Only allow pet owner or admin to update pet
    if (pet.userId.toString() !== currentUserId && currentUserRole !== 'admin') {
      throw new ForbiddenException('You can only update your own pets');
    }

    const updatedPet = await this.petModel
      .findByIdAndUpdate(petId, updateData, { new: true })
      .populate('userId', 'email')
      .exec();

    return updatedPet;
  }

  /**
   * Delete a pet
   */
  async delete(petId: string, currentUserId: string, currentUserRole: string): Promise<void> {
    const pet = await this.petModel.findById(petId).exec();
    
    if (!pet) {
      throw new NotFoundException('Pet not found');
    }

    // Only allow pet owner or admin to delete pet
    if (pet.userId.toString() !== currentUserId && currentUserRole !== 'admin') {
      throw new ForbiddenException('You can only delete your own pets');
    }

    await this.petModel.findByIdAndDelete(petId).exec();
  }
}
