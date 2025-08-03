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
import { PetsService } from './pets.service';
import { CreatePetDto } from './dto/create-pet.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('pets')
@UseGuards(JwtAuthGuard) // All pet endpoints require authentication
export class PetsController {
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
  constructor(private readonly petsService: PetsService) {}

  /**
   * POST /pets - Create a new pet
   * Authenticated users can create pets for themselves
   */
  @Post()
  async create(@Body() createPetDto: CreatePetDto, @Request() req) {
    const currentUser = req.user;
    return this.petsService.create(createPetDto, currentUser.userId);
  }

  /**
   * GET /pets/user/:userId - Get all pets for a specific user
   * Users can view their own pets, admins can view any user's pets
   */
  @Get('user/:userId')
  async findByUserId(@Param('userId') userId: string, @Request() req) {
    const currentUser = req.user;
    
    // Users can only view their own pets unless they are admin
    if (userId !== currentUser.userId && currentUser.role !== 'admin') {
      userId = currentUser.userId; // Override to current user's ID
    }
    
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
   */
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateData: Partial<CreatePetDto>,
    @Request() req
  ) {
    const currentUser = req.user;
    return this.petsService.update(id, updateData, currentUser.userId, currentUser.role);
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
}
