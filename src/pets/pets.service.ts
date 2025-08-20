import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Pet, PetDocument } from './schemas/pet.schema';
import { PetCare, PetCareDocument } from './schemas/pet-care.schema';
import { PetMedical, PetMedicalDocument } from './schemas/pet-medical.schema';
import { CreatePetDto } from './dto/create-pet.dto';
import { AzureBlobService } from '../azure-blob/azure-blob.service';

@Injectable()
export class PetsService {
  constructor(
    @InjectModel(Pet.name) private petModel: Model<PetDocument>,
    @InjectModel(PetCare.name) private petCareModel: Model<PetCareDocument>,
    @InjectModel(PetMedical.name) private petMedicalModel: Model<PetMedicalDocument>,
    private azureBlobService: AzureBlobService,
  ) {}

  /**
   * Get all pets (admin only)
   */
  async findAll(): Promise<Pet[]> {
    return this.petModel.find().populate('userId', 'email').exec();
  }

  /**
   * Create a new pet for a user
   */
  async create(createPetDto: CreatePetDto, userId: string, petImage?: Express.Multer.File): Promise<Pet> {
    let photoUrl = createPetDto.photo;

    // Upload pet image if provided
    if (petImage) {
      photoUrl = await this.azureBlobService.uploadFile(petImage, 'pets');
    }

    // Ensure userId is properly converted to ObjectId
    const userObjectId = new Types.ObjectId(userId);

    const newPet = new this.petModel({
      ...createPetDto,
      photo: photoUrl,
      userId: userObjectId,
    });
    
    return newPet.save();
  }

  /**
   * Get all pets for a specific user with their medical and care data
   */
  async findByUserId(userId: string): Promise<Pet[]> {
    try {
      // Convert userId to ObjectId for proper matching
      const objectId = new Types.ObjectId(userId);
      
      // Query for pets where userId matches in all possible formats
      const pets = await this.petModel
        .find({
          $or: [
            { userId: userId }, // Match as string (for legacy data)
            { userId: objectId }, // Match as ObjectId (proper format)
            { 'userId._id': userId }, // Match when userId is populated as object
            { 'userId._id': objectId } // Match when userId is populated as ObjectId
          ]
        })
        .populate('userId', 'email firstName lastName') // Populate user details
        .exec();

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
        
      return petsWithDetails;
      
    } catch (error) {
      console.error("Error in findByUserId:", error);
      return [];
    }
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
    currentUserRole: string,
    petImage?: Express.Multer.File
  ): Promise<Pet> {
    const pet = await this.petModel.findById(petId).exec();
    
    if (!pet) {
      throw new NotFoundException('Pet not found');
    }

    // Only allow pet owner or admin to update pet

    // Handle new pet image upload
    if (petImage) {
      // Delete old image if it exists
      if (pet.photo) {
        try {
          await this.azureBlobService.deleteFile(pet.photo);
        } catch (error) {
          console.log('Could not delete old pet image:', error.message);
        }
      }
      
      // Upload new image
      updateData.photo = await this.azureBlobService.uploadFile(petImage, 'pets');
    }

    const updatedPet = await this.petModel
      .findByIdAndUpdate(petId, updateData, { new: true })
      .populate('userId', 'email')
      .exec();

    return updatedPet;
  }

  /**
   * Update pet photo
   */
  async updatePetPhoto(petId: string, currentUserId: string, currentUserRole: string, petImage: Express.Multer.File): Promise<Pet> {
    const pet = await this.petModel.findById(petId).exec();
    
    if (!pet) {
      throw new NotFoundException('Pet not found');
    }

    // Only allow pet owner or admin to update pet photo
    if (pet.userId.toString() !== currentUserId && currentUserRole !== 'admin') {
      throw new ForbiddenException('You can only update your own pets');
    }

    // Delete old photo if it exists
    if (pet.photo) {
      try {
        await this.azureBlobService.deleteFile(pet.photo);
      } catch (error) {
        console.log('Could not delete old pet photo:', error.message);
      }
    }

    // Upload new photo
    const photoUrl = await this.azureBlobService.uploadFile(petImage, 'pets');

    const updatedPet = await this.petModel
      .findByIdAndUpdate(petId, { photo: photoUrl }, { new: true })
      .populate('userId', 'email')
      .exec();

    return updatedPet;
  }

  /**
   * Remove pet photo
   */
  async removePetPhoto(petId: string, currentUserId: string, currentUserRole: string): Promise<Pet> {
    const pet = await this.petModel.findById(petId).exec();
    
    if (!pet) {
      throw new NotFoundException('Pet not found');
    }

    // Only allow pet owner or admin to remove pet photo
    if (pet.userId.toString() !== currentUserId && currentUserRole !== 'admin') {
      throw new ForbiddenException('You can only update your own pets');
    }

    // Delete photo if it exists
    if (pet.photo) {
      try {
        await this.azureBlobService.deleteFile(pet.photo);
      } catch (error) {
        console.log('Could not delete pet photo:', error.message);
      }
    }

    const updatedPet = await this.petModel
      .findByIdAndUpdate(petId, { photo: null }, { new: true })
      .populate('userId', 'email')
      .exec();

    return updatedPet;
  }

  /**
   * Delete a pet (including all related medical and care data)
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

    // Delete associated medical and care data
    await Promise.all([
      this.petCareModel.findOneAndDelete({ petId }).exec(),
      this.petMedicalModel.findOneAndDelete({ petId }).exec()
    ]);

    // Delete pet photo if it exists
    if (pet.photo) {
      try {
        await this.azureBlobService.deleteFile(pet.photo);
      } catch (error) {
        console.log('Could not delete pet photo:', error.message);
      }
    }

    // Delete additional photos if they exist
    if (pet.photos && pet.photos.length > 0) {
      for (const photoUrl of pet.photos) {
        try {
          await this.azureBlobService.deleteFile(photoUrl);
        } catch (error) {
          console.log('Could not delete pet photo:', error.message);
        }
      }
    }

    await this.petModel.findByIdAndDelete(petId).exec();
  }
}
