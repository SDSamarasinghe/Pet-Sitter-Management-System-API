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
  ForbiddenException
} from '@nestjs/common';
import { PetCareService } from '../services/pet-care.service';
import { CreatePetCareDto, UpdatePetCareDto } from '../dto/pet-care.dto';
import { CreatePetMedicalDto, UpdatePetMedicalDto } from '../dto/pet-medical.dto';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';

@Controller('pets')
@UseGuards(JwtAuthGuard)
export class PetCareController {
  constructor(private readonly petCareService: PetCareService) {}

  // ===================== PET CARE ENDPOINTS =====================

  /**
   * POST /pets/:petId/care - Create care information for a pet
   */
  @Post(':petId/care')
  async createPetCare(
    @Param('petId') petId: string,
    @Body() createPetCareDto: CreatePetCareDto,
    @Request() req
  ) {
    const currentUser = req.user;
    // Set petId from URL parameter
    createPetCareDto.petId = petId;
    return this.petCareService.createPetCare(createPetCareDto, currentUser.userId, currentUser.role);
  }

  /**
   * GET /pets/:petId/care - Get care information for a pet
   */
  @Get(':petId/care')
  async getPetCare(@Param('petId') petId: string, @Request() req) {
    const currentUser = req.user;
    return this.petCareService.getPetCare(petId, currentUser.userId, currentUser.role);
  }

  /**
   * PUT /pets/:petId/care - Update care information for a pet
   */
  @Put(':petId/care')
  async updatePetCare(
    @Param('petId') petId: string,
    @Body() updatePetCareDto: UpdatePetCareDto,
    @Request() req
  ) {
    const currentUser = req.user;
    return this.petCareService.updatePetCare(petId, updatePetCareDto, currentUser.userId, currentUser.role);
  }

  /**
   * DELETE /pets/:petId/care - Delete care information for a pet
   */
  @Delete(':petId/care')
  async deletePetCare(@Param('petId') petId: string, @Request() req) {
    const currentUser = req.user;
    await this.petCareService.deletePetCare(petId, currentUser.userId, currentUser.role);
    return { message: 'Pet care information deleted successfully' };
  }

  // ===================== PET MEDICAL ENDPOINTS =====================

  /**
   * POST /pets/:petId/medical - Create medical information for a pet
   */
  @Post(':petId/medical')
  async createPetMedical(
    @Param('petId') petId: string,
    @Body() createPetMedicalDto: CreatePetMedicalDto,
    @Request() req
  ) {
    const currentUser = req.user;
    // Set petId from URL parameter
    createPetMedicalDto.petId = petId;
    return this.petCareService.createPetMedical(createPetMedicalDto, currentUser.userId, currentUser.role);
  }

  /**
   * GET /pets/:petId/medical - Get medical information for a pet
   */
  @Get(':petId/medical')
  async getPetMedical(@Param('petId') petId: string, @Request() req) {
    const currentUser = req.user;
    return this.petCareService.getPetMedical(petId, currentUser.userId, currentUser.role);
  }

  /**
   * PUT /pets/:petId/medical - Update medical information for a pet
   */
  @Put(':petId/medical')
  async updatePetMedical(
    @Param('petId') petId: string,
    @Body() updatePetMedicalDto: UpdatePetMedicalDto,
    @Request() req
  ) {
    const currentUser = req.user;
    return this.petCareService.updatePetMedical(petId, updatePetMedicalDto, currentUser.userId, currentUser.role);
  }

  /**
   * DELETE /pets/:petId/medical - Delete medical information for a pet
   */
  @Delete(':petId/medical')
  async deletePetMedical(@Param('petId') petId: string, @Request() req) {
    const currentUser = req.user;
    await this.petCareService.deletePetMedical(petId, currentUser.userId, currentUser.role);
    return { message: 'Pet medical information deleted successfully' };
  }

  // ===================== COMBINED ENDPOINTS =====================

  /**
   * GET /pets/:petId/care-medical - Get both care and medical information for a pet
   */
  @Get(':petId/care-medical')
  async getPetCareAndMedical(@Param('petId') petId: string, @Request() req) {
    const currentUser = req.user;
    return this.petCareService.getPetCareAndMedical(petId, currentUser.userId, currentUser.role);
  }

  /**
   * GET /pets/admin/care-medical - Get all pets with care and medical information (Admin only)
   */
  @Get('admin/care-medical')
  async getAllPetsCareAndMedical(@Request() req) {
    const currentUser = req.user;
    return this.petCareService.getAllPetsCareAndMedical(currentUser.role);
  }

  // ===================== ADMIN DIRECT UPDATE ENDPOINTS =====================

  /**
   * PUT /pets/admin/care - Update care information for any pet (Admin only)
   * Body should include petId and care details
   */
  @Put('admin/care')
  async adminUpdatePetCare(
    @Body() updateData: CreatePetCareDto & UpdatePetCareDto,
    @Request() req
  ) {
    const currentUser = req.user;
    
    if (!updateData.petId) {
      throw new ForbiddenException('Pet ID is required');
    }

    const { petId, ...careData } = updateData;
    return this.petCareService.updatePetCare(petId, careData, currentUser.userId, currentUser.role);
  }

  /**
   * PUT /pets/admin/medical - Update medical information for any pet (Admin only)
   * Body should include petId and medical details
   */
  @Put('admin/medical')
  async adminUpdatePetMedical(
    @Body() updateData: CreatePetMedicalDto & UpdatePetMedicalDto,
    @Request() req
  ) {
    const currentUser = req.user;
    
    if (!updateData.petId) {
      throw new ForbiddenException('Pet ID is required');
    }

    const { petId, ...medicalData } = updateData;
    return this.petCareService.updatePetMedical(petId, medicalData, currentUser.userId, currentUser.role);
  }
}
