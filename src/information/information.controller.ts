import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete,
  Body, 
  Param, 
  UseGuards 
} from '@nestjs/common';
import { InformationService } from './information.service';
import { CreateInformationPageDto, UpdateInformationPageDto } from './dto/information-page.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('information')
export class InformationController {
  constructor(private readonly informationService: InformationService) {}

  /**
   * GET /information/pages - Get all published pages
   */
  @Get('pages')
  async getPublishedPages() {
    return this.informationService.getPublishedPages();
  }

  /**
   * GET /information/contact - Get contact information
   */
  @Get('contact')
  async getContactInfo() {
    return this.informationService.getContactInfo();
  }

  /**
   * GET /information/meet-sitters - Get meet the sitters page
   */
  @Get('meet-sitters')
  async getMeetSittersPage() {
    return this.informationService.getMeetSittersPage();
  }

  /**
   * GET /information/relocation-notice - Get relocation notice
   */
  @Get('relocation-notice')
  async getRelocationNotice() {
    return this.informationService.getRelocationNotice();
  }

  /**
   * GET /information/type/:type - Get pages by type
   */
  @Get('type/:type')
  async getByType(@Param('type') type: string) {
    return this.informationService.getByType(type);
  }

  /**
   * GET /information/slug/:slug - Get page by slug
   */
  @Get('slug/:slug')
  async getBySlug(@Param('slug') slug: string) {
    return this.informationService.getBySlug(slug);
  }

  /**
   * POST /information/pages - Create new information page (admin only)
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post('pages')
  async create(@Body() createInformationPageDto: CreateInformationPageDto) {
    return this.informationService.create(createInformationPageDto);
  }

  /**
   * GET /information/:id - Get page by ID
   */
  @Get(':id')
  async getById(@Param('id') id: string) {
    return this.informationService.getById(id);
  }

  /**
   * PUT /information/:id - Update information page (admin only)
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateInformationPageDto: UpdateInformationPageDto
  ) {
    return this.informationService.update(id, updateInformationPageDto);
  }

  /**
   * DELETE /information/:id - Delete information page (admin only)
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Delete(':id')
  async delete(@Param('id') id: string) {
    await this.informationService.delete(id);
    return { message: 'Information page deleted successfully' };
  }

  /**
   * GET /information/admin/all - Get all pages including unpublished (admin only)
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get('admin/all')
  async getAllForAdmin() {
    return this.informationService.getAllForAdmin();
  }

  /**
   * POST /information/admin/initialize - Initialize default pages (admin only)
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Post('admin/initialize')
  async initializeDefaultPages() {
    await this.informationService.initializeDefaultPages();
    return { message: 'Default pages initialized successfully' };
  }
}
