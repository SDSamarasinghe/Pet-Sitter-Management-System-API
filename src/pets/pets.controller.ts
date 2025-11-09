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
  UseInterceptors,
  UploadedFile,
  Res
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { PetsService } from './pets.service';
import { PetCareService } from './services/pet-care.service';
import { CreatePetDto } from './dto/create-pet.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('pets')
@UseGuards(JwtAuthGuard) // All pet endpoints require authentication
export class PetsController {
  constructor(
    private readonly petsService: PetsService,
    private readonly petCareService: PetCareService
  ) {}

  /**
   * GET /pets - Get all pets (admin only)
   */
  @Get()
  async findAll(@Request() req) {
    const currentUser = req.user;
    if (currentUser.role !== 'admin') {
      throw new ForbiddenException('Only admin can view all pets');
    }
    return this.petsService.findAll();
  }

  /**
   * POST /pets - Create a new pet
   * Authenticated users can create pets for themselves
   * Supports multipart/form-data for pet image upload
   */
  @Post()
  @UseInterceptors(FileInterceptor('petImage'))
  async create(
    @Body() createPetDto: CreatePetDto, 
    @UploadedFile() petImage: Express.Multer.File,
    @Request() req
  ) {
    const currentUser = req.user;
    return this.petsService.create(createPetDto, currentUser.userId, petImage);
  }

  /**
   * GET /pets/user/:userId - Get all pets for a specific user
   * Users can view their own pets, admins can view any user's pets
   */
  @Get('user/:userId')
  async findByUserId(@Param('userId') userId: string, @Request() req) {
    // const currentUser = req.user;
    
    // Users can only view their own pets unless they are admin
    // if (userId !== currentUser.userId && currentUser.role !== 'admin') {
    //   userId = currentUser.userId; // Override to current user's ID
    // }
    
    return this.petsService.findByUserId(userId);
  }

  /**
   * GET /pets/:id - Get pet by ID
   * Pet owner and admins can view pet details
   */
  @Get(':id')
  async findById(@Param('id') id: string, @Request() req) {
    const currentUser = req.user;
    return this.petsService.findById(id, currentUser.userId, currentUser.role);
  }

  /**
   * PUT /pets/:id - Update pet information
   * Pet owner and admins can update pet details
   * Supports multipart/form-data for pet image upload
   */
  @Put(':id')
  @UseInterceptors(FileInterceptor('petImage'))
  async update(
    @Param('id') id: string,
    @Body() updateData: Partial<CreatePetDto>,
    @UploadedFile() petImage: Express.Multer.File,
    @Request() req
  ) {
    const currentUser = req.user;
    return this.petsService.update(id, updateData, currentUser.userId, currentUser.role, petImage);
  }

  /**
   * POST /pets/:id/photo - Update pet photo
   * Pet owner and admins can update pet photo
   */
  @Post(':id/photo')
  @UseInterceptors(FileInterceptor('petImage'))
  async updatePhoto(
    @Param('id') id: string,
    @UploadedFile() petImage: Express.Multer.File,
    @Request() req
  ) {
    const currentUser = req.user;
    
    if (!petImage) {
      throw new ForbiddenException('Pet image is required');
    }
    
    return this.petsService.updatePetPhoto(id, currentUser.userId, currentUser.role, petImage);
  }

  /**
   * DELETE /pets/:id/photo - Remove pet photo
   * Pet owner and admins can remove pet photo
   */
  @Delete(':id/photo')
  async removePhoto(@Param('id') id: string, @Request() req) {
    const currentUser = req.user;
    await this.petsService.removePetPhoto(id, currentUser.userId, currentUser.role);
    return { message: 'Pet photo removed successfully' };
  }

  /**
   * DELETE /pets/:id - Delete a pet
   * Pet owner and admins can delete pets
   */
  @Delete(':id')
  async delete(@Param('id') id: string, @Request() req) {
    const currentUser = req.user;
    await this.petsService.delete(id, currentUser.userId, currentUser.role);
    return { message: 'Pet deleted successfully' };
  }

  /**
   * GET /pets/:id/profile - Get complete pet profile (basic + care + medical)
   * Pet owner and admins can view complete profile
   */
  @Get(':id/profile')
  async getCompletePetProfile(@Param('id') id: string, @Request() req) {
    const currentUser = req.user;
    return this.petCareService.getCompletePetProfile(id, currentUser.userId, currentUser.role);
  }

  /**
   * GET /pets/:id/pdf - Generate and download pet profile PDF
   * Pet owner and admins can download PDF
   */
  @Get(':id/pdf')
  async downloadPetProfilePDF(@Param('id') id: string, @Request() req, @Res() res: Response) {
    const currentUser = req.user;
    
    try {
      // Get complete pet profile
      const petProfile = await this.petCareService.getCompletePetProfile(id, currentUser.userId, currentUser.role);
      
      // Generate PDF content
      const pdfContent = this.generatePetProfilePDF(petProfile);
      
      // Set response headers for PDF download
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="pet-profile-${petProfile.pet.name}.pdf"`,
        'Content-Length': Buffer.byteLength(pdfContent)
      });
      
      res.send(pdfContent);
    } catch (error) {
      res.status(500).json({ 
        success: false, 
        message: 'Failed to generate PDF',
        error: error.message 
      });
    }
  }

  /**
   * GET /pets/user/:userId/with-details - Get user's pets with care and medical details
   * Users can view their own pets with details, admins can view any user's pets
   */
  @Get('user/:userId/with-details')
  async findByUserIdWithDetails(@Param('userId') userId: string, @Request() req) {
    const currentUser = req.user;
    
    // Users can only view their own pets unless they are admin
    if (userId !== currentUser.userId && currentUser.role !== 'admin') {
      userId = currentUser.userId; // Override to current user's ID
    }
    
    return this.petCareService.getUserPetsCareAndMedical(userId);
  }

  /**
   * Private method to generate PDF content
   */
  private generatePetProfilePDF(petProfile: any): Buffer {
    // Simple text-based PDF generation (you can enhance this with a proper PDF library)
    const petData = petProfile.pet;
    const careData = petProfile.care;
    const medicalData = petProfile.medical;
    
    let pdfText = `
PET PROFILE INFORMATION SHEET
========================================

BASIC INFORMATION
----------------------------------------
Name: ${petData.name || 'N/A'}
Type: ${petData.type || 'N/A'}
Breed: ${petData.breed || 'N/A'}
Age: ${petData.age || 'N/A'}
Weight: ${petData.weight || 'N/A'}
Species: ${petData.species || 'N/A'}
Microchip Number: ${petData.microchipNumber || 'N/A'}
Information: ${petData.info || 'N/A'}

MEDICAL INFORMATION
----------------------------------------`;

    if (medicalData) {
      pdfText += `
Veterinarian Business: ${medicalData.vetBusinessName || 'N/A'}
Veterinarian Doctor: ${medicalData.vetDoctorName || 'N/A'}
Vet Address: ${medicalData.vetAddress || 'N/A'}
Vet Phone: ${medicalData.vetPhoneNumber || 'N/A'}
Vaccination Status: ${medicalData.currentOnVaccines || 'N/A'}`;
    } else {
      pdfText += `
No medical information available.`;
    }

    pdfText += `

CARE INFORMATION
----------------------------------------`;

    if (careData) {
      pdfText += `
Care Instructions: ${careData.careInstructions || 'N/A'}
Feeding Schedule: ${careData.feedingSchedule || 'N/A'}
Exercise Requirements: ${careData.exerciseRequirements || 'N/A'}`;
    } else {
      pdfText += `
No care information available.`;
    }

    if (petData.vaccinations) {
      pdfText += `

ADDITIONAL INFORMATION
----------------------------------------
Vaccinations: ${petData.vaccinations}`;
    }

    if (petData.medications) {
      pdfText += `
Current Medications: ${petData.medications}`;
    }

    if (petData.allergies) {
      pdfText += `
Allergies: ${petData.allergies}`;
    }

    if (petData.dietaryRestrictions) {
      pdfText += `
Dietary Restrictions: ${petData.dietaryRestrictions}`;
    }

    if (petData.behaviorNotes) {
      pdfText += `
Behavior Notes: ${petData.behaviorNotes}`;
    }

    if (petData.emergencyContact) {
      pdfText += `
Emergency Contact: ${petData.emergencyContact}`;
    }

    if (petData.veterinarianInfo) {
      pdfText += `
Veterinarian Info: ${petData.veterinarianInfo}`;
    }

    if (petData.careInstructions) {
      pdfText += `
Care Instructions: ${petData.careInstructions}`;
    }

    pdfText += `

----------------------------------------
Generated on: ${new Date().toLocaleString()}
Pet-Sitter Management System
`;

    // Convert text to simple PDF-like format (basic implementation)
    // For production, use a proper PDF library like PDFKit or Puppeteer
    return Buffer.from(pdfText, 'utf-8');
  }
}
