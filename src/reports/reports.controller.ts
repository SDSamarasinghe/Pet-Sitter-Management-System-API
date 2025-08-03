import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete, 
  Body, 
  Param, 
  UseGuards, 
  Request 
} from '@nestjs/common';
import { ReportsService } from './reports.service';
import { CreateReportDto } from './dto/create-report.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('reports')
@UseGuards(JwtAuthGuard) // All report endpoints require authentication
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  /**
   * POST /reports - Create a new report
   * Sitters and admins can create reports
   */
  @UseGuards(RolesGuard)
  @Roles('sitter', 'admin')
  @Post()
  async create(@Body() createReportDto: CreateReportDto, @Request() req) {
    const currentUser = req.user;
    return this.reportsService.create(createReportDto, currentUser.userId);
  }

  /**
   * GET /reports/user/:userId - Get reports for a specific user (client)
   * Users can view their own reports, admins can view any user's reports
   */
  @Get('user/:userId')
  async findByUserId(@Param('userId') userId: string, @Request() req) {
    const currentUser = req.user;
    
    // Users can only view their own reports unless they are admin
    if (userId !== currentUser.userId && currentUser.role !== 'admin') {
      userId = currentUser.userId; // Override to current user's ID
    }
    
    return this.reportsService.findByUserId(userId);
  }

  /**
   * GET /reports/sitter/:sitterId - Get reports submitted by a sitter
   * Sitters can view their own reports, admins can view any sitter's reports
   */
  @Get('sitter/:sitterId')
  async findBySitterId(@Param('sitterId') sitterId: string, @Request() req) {
    const currentUser = req.user;
    
    // Sitters can only view their own reports unless they are admin
    if (sitterId !== currentUser.userId && currentUser.role !== 'admin') {
      sitterId = currentUser.userId; // Override to current user's ID
    }
    
    return this.reportsService.findBySitterId(sitterId);
  }

  /**
   * GET /reports - Get all reports (admin only)
   */
  @UseGuards(RolesGuard)
  @Roles('admin')
  @Get()
  async findAll() {
    return this.reportsService.findAll();
  }

  /**
   * GET /reports/:id - Get report by ID
   * Users can view reports about them or reports they created
   */
  @Get(':id')
  async findById(@Param('id') id: string, @Request() req) {
    const currentUser = req.user;
    return this.reportsService.findById(id, currentUser.userId, currentUser.role);
  }

  /**
   * PUT /reports/:id - Update report
   * Sitters can update their own reports, admins can update any report
   */
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateData: Partial<CreateReportDto>,
    @Request() req
  ) {
    const currentUser = req.user;
    return this.reportsService.update(id, updateData, currentUser.userId, currentUser.role);
  }

  /**
   * DELETE /reports/:id - Delete report
   * Sitters can delete their own reports, admins can delete any report
   */
  @Delete(':id')
  async delete(@Param('id') id: string, @Request() req) {
    const currentUser = req.user;
    await this.reportsService.delete(id, currentUser.userId, currentUser.role);
    return { message: 'Report deleted successfully' };
  }
}
