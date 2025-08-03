import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete,
  Body, 
  Param, 
  Query,
  UseGuards, 
  Request 
} from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { CreateInvoiceDto, UpdateInvoiceDto, PayInvoiceDto } from './dto/invoice.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('invoices')
@UseGuards(JwtAuthGuard)
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  /**
   * POST /invoices - Create a new invoice (admin only)
   */
  @UseGuards(RolesGuard)
  @Roles('admin')
  @Post()
  async create(@Body() createInvoiceDto: CreateInvoiceDto) {
    return this.invoicesService.create(createInvoiceDto);
  }

  /**
   * GET /invoices/client/:clientId - Get client's invoices
   */
  @Get('client/:clientId')
  async getClientInvoices(
    @Param('clientId') clientId: string,
    @Request() req,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @Query('status') status?: string
  ) {
    return this.invoicesService.getClientInvoices(
      clientId,
      req.user.userId,
      req.user.role,
      parseInt(page),
      parseInt(limit),
      status
    );
  }

  /**
   * GET /invoices/:id - Get invoice by ID
   */
  @Get(':id')
  async getById(@Param('id') id: string, @Request() req) {
    return this.invoicesService.getById(id, req.user.userId, req.user.role);
  }

  /**
   * PUT /invoices/:id - Update invoice (admin only)
   */
  @UseGuards(RolesGuard)
  @Roles('admin')
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateInvoiceDto: UpdateInvoiceDto,
    @Request() req
  ) {
    return this.invoicesService.update(id, updateInvoiceDto, req.user.role);
  }

  /**
   * PUT /invoices/:id/pay - Mark invoice as paid
   */
  @Put(':id/pay')
  async markAsPaid(
    @Param('id') id: string,
    @Body() payInvoiceDto: PayInvoiceDto,
    @Request() req
  ) {
    return this.invoicesService.markAsPaid(
      id,
      payInvoiceDto,
      req.user.userId,
      req.user.role
    );
  }

  /**
   * GET /invoices/admin/all - Get all invoices (admin only)
   */
  @UseGuards(RolesGuard)
  @Roles('admin')
  @Get('admin/all')
  async getAllForAdmin(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @Query('status') status?: string
  ) {
    return this.invoicesService.getAllForAdmin(
      parseInt(page),
      parseInt(limit),
      status
    );
  }

  /**
   * GET /invoices/stats/:clientId? - Get invoice statistics
   */
  @Get('stats/:clientId?')
  async getInvoiceStats(
    @Param('clientId') clientId: string,
    @Request() req
  ) {
    // If clientId provided and user is not admin, verify it's their own stats
    if (clientId && clientId !== req.user.userId && req.user.role !== 'admin') {
      clientId = req.user.userId;
    }
    
    return this.invoicesService.getInvoiceStats(clientId);
  }

  /**
   * DELETE /invoices/:id - Delete invoice (admin only)
   */
  @UseGuards(RolesGuard)
  @Roles('admin')
  @Delete(':id')
  async delete(@Param('id') id: string, @Request() req) {
    await this.invoicesService.delete(id, req.user.role);
    return { message: 'Invoice deleted successfully' };
  }

  /**
   * POST /invoices/admin/mark-overdue - Mark overdue invoices (admin only)
   */
  @UseGuards(RolesGuard)
  @Roles('admin')
  @Post('admin/mark-overdue')
  async markOverdue() {
    await this.invoicesService.markOverdueInvoices();
    return { message: 'Overdue invoices marked successfully' };
  }
}
