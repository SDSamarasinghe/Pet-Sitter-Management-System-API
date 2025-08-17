import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { PetCare, PetCareDocument } from '../schemas/pet-care.schema';
import { PetMedical, PetMedicalDocument } from '../schemas/pet-medical.schema';
import { Pet, PetDocument } from '../schemas/pet.schema';
import { CreatePetCareDto, UpdatePetCareDto } from '../dto/pet-care.dto';
import { CreatePetMedicalDto, UpdatePetMedicalDto } from '../dto/pet-medical.dto';

@Injectable()
export class PetCareService {
  constructor(
    @InjectModel(PetCare.name) private petCareModel: Model<PetCareDocument>,
    @InjectModel(PetMedical.name) private petMedicalModel: Model<PetMedicalDocument>,
    @InjectModel(Pet.name) private petModel: Model<PetDocument>,
  ) {}

  // ===================== PET CARE METHODS =====================

  /**
   * Create care information for a pet
   */
  async createPetCare(createPetCareDto: CreatePetCareDto, currentUserId: string, currentUserRole: string): Promise<PetCare> {
    // Verify pet exists and user has permission
    const pet = await this.petModel.findById(createPetCareDto.petId);
    if (!pet) {
      throw new NotFoundException('Pet not found');
    }

    // Allow pet owner or admin to create care information
    if (pet.userId.toString() !== currentUserId && currentUserRole !== 'admin') {
      throw new ForbiddenException('You can only manage care information for your own pets');
    }

    // Check if care info already exists for this pet
    const existingCare = await this.petCareModel.findOne({ petId: createPetCareDto.petId });
    if (existingCare) {
      throw new ForbiddenException('Care information already exists for this pet. Use update instead.');
    }

    const newCare = new this.petCareModel(createPetCareDto);
    return newCare.save();
  }

  /**
   * Get care information for a pet
   */
  async getPetCare(petId: string, currentUserId?: string, currentUserRole?: string): Promise<PetCare | null> {
    // If user context is provided, verify permissions
    if (currentUserId && currentUserRole) {
      const pet = await this.petModel.findById(petId);
      if (!pet) {
        throw new NotFoundException('Pet not found');
      }

      // Allow pet owner or admin to view care information
      if (pet.userId.toString() !== currentUserId && currentUserRole !== 'admin') {
        throw new ForbiddenException('You can only view care information for your own pets');
      }
    }

    return this.petCareModel.findOne({ petId }).populate('petId', 'name type').exec();
  }

  /**
   * Update care information for a pet
   */
  async updatePetCare(petId: string, updatePetCareDto: UpdatePetCareDto, currentUserId: string, currentUserRole: string): Promise<PetCare> {
    // Verify pet exists and user has permission
    const pet = await this.petModel.findById(petId);
    if (!pet) {
      throw new NotFoundException('Pet not found');
    }

    // Allow pet owner or admin to update care information

    const updatedCare = await this.petCareModel
      .findOneAndUpdate({ petId }, updatePetCareDto, { new: true, upsert: true })
      .populate('petId', 'name type')
      .exec();

    return updatedCare;
  }

  /**
   * Delete care information for a pet
   */
  async deletePetCare(petId: string, currentUserId: string, currentUserRole: string): Promise<void> {
    // Verify pet exists and user has permission
    const pet = await this.petModel.findById(petId);
    if (!pet) {
      throw new NotFoundException('Pet not found');
    }

    // Allow pet owner or admin to delete care information
    if (pet.userId.toString() !== currentUserId && currentUserRole !== 'admin') {
      throw new ForbiddenException('You can only manage care information for your own pets');
    }

    const result = await this.petCareModel.findOneAndDelete({ petId }).exec();
    if (!result) {
      throw new NotFoundException('Pet care information not found');
    }
  }

  // ===================== PET MEDICAL METHODS =====================

  /**
   * Create medical information for a pet
   */
  async createPetMedical(createPetMedicalDto: CreatePetMedicalDto, currentUserId: string, currentUserRole: string): Promise<PetMedical> {
    // Verify pet exists and user has permission
    const pet = await this.petModel.findById(createPetMedicalDto.petId);
    if (!pet) {
      throw new NotFoundException('Pet not found');
    }

    // Allow pet owner or admin to create medical information
    if (pet.userId.toString() !== currentUserId && currentUserRole !== 'admin') {
      throw new ForbiddenException('You can only manage medical information for your own pets');
    }

    // Check if medical info already exists for this pet
    const existingMedical = await this.petMedicalModel.findOne({ petId: createPetMedicalDto.petId });
    if (existingMedical) {
      throw new ForbiddenException('Medical information already exists for this pet. Use update instead.');
    }

    const newMedical = new this.petMedicalModel(createPetMedicalDto);
    return newMedical.save();
  }

  /**
   * Get medical information for a pet
   */
  async getPetMedical(petId: string, currentUserId?: string, currentUserRole?: string): Promise<PetMedical | null> {
    // If user context is provided, verify permissions
    if (currentUserId && currentUserRole) {
      const pet = await this.petModel.findById(petId);
      if (!pet) {
        throw new NotFoundException('Pet not found');
      }

      // Allow pet owner or admin to view medical information
      if (pet.userId.toString() !== currentUserId && currentUserRole !== 'admin') {
        throw new ForbiddenException('You can only view medical information for your own pets');
      }
    }

    return this.petMedicalModel.findOne({ petId }).populate('petId', 'name type').exec();
  }

  /**
   * Update medical information for a pet
   */
  async updatePetMedical(petId: string, updatePetMedicalDto: UpdatePetMedicalDto, currentUserId: string, currentUserRole: string): Promise<PetMedical> {
    // Verify pet exists and user has permission
    const pet = await this.petModel.findById(petId);
    if (!pet) {
      throw new NotFoundException('Pet not found');
    }

    // Allow pet owner or admin to update medical information

    const updatedMedical = await this.petMedicalModel
      .findOneAndUpdate({ petId }, updatePetMedicalDto, { new: true, upsert: true })
      .populate('petId', 'name type')
      .exec();

    return updatedMedical;
  }

  /**
   * Delete medical information for a pet
   */
  async deletePetMedical(petId: string, currentUserId: string, currentUserRole: string): Promise<void> {
    // Verify pet exists and user has permission
    const pet = await this.petModel.findById(petId);
    if (!pet) {
      throw new NotFoundException('Pet not found');
    }

    // Allow pet owner or admin to delete medical information
    if (pet.userId.toString() !== currentUserId && currentUserRole !== 'admin') {
      throw new ForbiddenException('You can only manage medical information for your own pets');
    }

    const result = await this.petMedicalModel.findOneAndDelete({ petId }).exec();
    if (!result) {
      throw new NotFoundException('Pet medical information not found');
    }
  }

  // ===================== COMBINED METHODS =====================

  /**
   * Get both care and medical information for a pet
   */
  async getPetCareAndMedical(petId: string, currentUserId?: string, currentUserRole?: string): Promise<{ care: PetCare | null; medical: PetMedical | null }> {
    const [care, medical] = await Promise.all([
      this.getPetCare(petId, currentUserId, currentUserRole),
      this.getPetMedical(petId, currentUserId, currentUserRole)
    ]);

    return { care, medical };
  }

  /**
   * Get user's pets with their care and medical information
   */
  async getUserPetsCareAndMedical(userId: string): Promise<any[]> {
    const pets = await this.petModel.find({ userId }).populate('userId', 'firstName lastName email').exec();
    
    const petsWithCareAndMedical = await Promise.all(
      pets.map(async (pet) => {
        const [care, medical] = await Promise.all([
          this.getPetCare(pet._id.toString()),
          this.getPetMedical(pet._id.toString())
        ]);

        return {
          pet: pet.toObject(),
          care,
          medical
        };
      })
    );

    return petsWithCareAndMedical;
  }

  /**
   * Get complete pet profile including basic, care, and medical information
   */
  async getCompletePetProfile(petId: string, currentUserId: string, currentUserRole: string): Promise<any> {
    // Verify pet exists and user has permission
    const pet = await this.petModel.findById(petId).populate('userId', 'firstName lastName email').exec();
    if (!pet) {
      throw new NotFoundException('Pet not found');
    }

    // Allow pet owner or admin to view complete profile
    if (pet.userId._id.toString() !== currentUserId && currentUserRole !== 'admin') {
      throw new ForbiddenException('You can only view your own pets');
    }

    const [care, medical] = await Promise.all([
      this.getPetCare(petId),
      this.getPetMedical(petId)
    ]);

    return {
      pet: pet.toObject(),
      care,
      medical
    };
  }

  /**
   * Get all pets with their care and medical information (admin only)
   */
  async getAllPetsCareAndMedical(currentUserRole: string): Promise<any[]> {
    // Only admin can view all pets care and medical info
    if (currentUserRole !== 'admin') {
      throw new ForbiddenException('Only admin can view all pets care and medical information');
    }

    const pets = await this.petModel.find().populate('userId', 'firstName lastName email').exec();
    
    const petsWithCareAndMedical = await Promise.all(
      pets.map(async (pet) => {
        const [care, medical] = await Promise.all([
          this.getPetCare(pet._id.toString()),
          this.getPetMedical(pet._id.toString())
        ]);

        return {
          pet: pet.toObject(),
          care,
          medical
        };
      })
    );

    return petsWithCareAndMedical;
  }
}
