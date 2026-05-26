import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Pet, PetDocument } from './schemas/pet.schema';
import { PetCare, PetCareDocument } from './schemas/pet-care.schema';
import { PetMedical, PetMedicalDocument } from './schemas/pet-medical.schema';
import { CreatePetDto } from './dto/create-pet.dto';
import { AzureBlobService } from '../azure-blob/azure-blob.service';
import { ActivityLogService } from '../activity-log/activity-log.service';

@Injectable()
export class PetsService {
  constructor(
    @InjectModel(Pet.name) private petModel: Model<PetDocument>,
    @InjectModel(PetCare.name) private petCareModel: Model<PetCareDocument>,
    @InjectModel(PetMedical.name) private petMedicalModel: Model<PetMedicalDocument>,
    private azureBlobService: AzureBlobService,
    private activityLogService: ActivityLogService,
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
  async create(createPetDto: CreatePetDto, userId: string, petImage?: any): Promise<Pet> {
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
    
    const savedPet = await newPet.save();

    try {
      await this.activityLogService.log(
        userId,
        'Pet created',
        'pet',
        `Created pet "${createPetDto.name}" (${createPetDto.species})`,
        { species: createPetDto.species, breed: createPetDto.breed },
        savedPet._id.toString(),
        'pet',
      );
    } catch (error) {
      console.error('Failed to write pet create activity log:', (error as Error)?.message || error);
    }

    return savedPet;
  }

  /**
   * Get all pets for a specific user with their medical and care data
   */
  async findByUserId(userId: string): Promise<Pet[]> {
    try {
      // Convert userId to ObjectId for proper matching
      const userObjectId = new Types.ObjectId(userId); 
      
      // Query for pets where userId matches
      const pets = await this.petModel
        .find({ userId: userObjectId })
        .populate('userId', 'email firstName lastName') // Populate user details
        .exec();

      // For each pet, fetch and attach medical and care data
      const petsWithDetails = await Promise.all(
        pets.map(async (pet) => {
          const petObjectId = pet._id; // Use ObjectId directly
          
          const [careData, medicalData] = await Promise.all([
            this.petCareModel.findOne({ petId: petObjectId }).exec(),
            this.petMedicalModel.findOne({ petId: petObjectId }).exec()
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
    petImage?: any
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
          console.log('Could not delete old pet image:', (error as Error)?.message);
        }
      }
      
      // Upload new image
      updateData.photo = await this.azureBlobService.uploadFile(petImage, 'pets');
    }

    const updatedPet = await this.petModel
      .findByIdAndUpdate(petId, updateData, { new: true })
      .populate('userId', 'email')
      .exec();

    try {
      await this.activityLogService.log(
        currentUserId,
        'Pet updated',
        'pet',
        `Updated pet "${updatedPet?.name || 'Unknown'}"`,
        { changedFields: Object.keys(updateData) },
        petId,
        'pet',
      );
    } catch (error) {
      console.error('Failed to write pet update activity log:', (error as Error)?.message || error);
    }

    return updatedPet;
  }

  /**
   * Update pet photo
   */
  async updatePetPhoto(petId: string, currentUserId: string, currentUserRole: string, petImage: any): Promise<Pet> {
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
        console.log('Could not delete old pet photo:', (error as Error)?.message);
      }
    }

    // Upload new photo
    const photoUrl = await this.azureBlobService.uploadFile(petImage, 'pets');

    const updatedPet = await this.petModel
      .findByIdAndUpdate(petId, { photo: photoUrl }, { new: true })
      .populate('userId', 'email')
      .exec();

    try {
      await this.activityLogService.log(
        currentUserId,
        'Pet photo uploaded',
        'pet',
        `Uploaded photo for pet "${updatedPet?.name || 'Unknown'}"`,
        {},
        petId,
        'pet',
      );
    } catch (error) {
      console.error('Failed to write pet photo upload activity log:', (error as Error)?.message || error);
    }

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
        console.log('Could not delete pet photo:', (error as Error)?.message);
      }
    }

    const updatedPet = await this.petModel
      .findByIdAndUpdate(petId, { photo: null }, { new: true })
      .populate('userId', 'email')
      .exec();

    try {
      await this.activityLogService.log(
        currentUserId,
        'Pet photo deleted',
        'pet',
        `Removed photo for pet "${updatedPet?.name || 'Unknown'}"`,
        {},
        petId,
        'pet',
      );
    } catch (error) {
      console.error('Failed to write pet photo delete activity log:', (error as Error)?.message || error);
    }

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
        console.log('Could not delete pet photo:', (error as Error)?.message);
      }
    }

    // Delete additional photos if they exist
    if (pet.photos && pet.photos.length > 0) {
      for (const photoUrl of pet.photos) {
        try {
          await this.azureBlobService.deleteFile(photoUrl);
        } catch (error) {
          console.log('Could not delete pet photo:', (error as Error)?.message);
        }
      }
    }

    await this.petModel.findByIdAndDelete(petId).exec();

    try {
      await this.activityLogService.log(
        currentUserId,
        'Pet deleted',
        'pet',
        `Deleted pet "${pet.name}" (${pet.species})`,
        { species: pet.species, breed: pet.breed },
        petId,
        'pet',
      );
    } catch (error) {
      console.error('Failed to write pet delete activity log:', (error as Error)?.message || error);
    }
  }
}
