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
import { KeySecurityService } from './key-security.service';
import { CreateKeySecurityDto, UpdateKeySecurityDto } from './dto/key-security.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('key-security')
@UseGuards(JwtAuthGuard)
export class KeySecurityController {
  constructor(private readonly keySecurityService: KeySecurityService) {}

  /**
   * POST /key-security/client/:clientId - Create or update key security info
   */
  @Post('client/:clientId')
  async createOrUpdate(
    @Param('clientId') clientId: string,
    @Body() createKeySecurityDto: CreateKeySecurityDto,
    @Request() req
  ) {
    return this.keySecurityService.createOrUpdate(
      createKeySecurityDto,
      clientId,
      req.user.userId,
      req.user.role
    );
  }

  /**
   * GET /key-security/client/:clientId - Get key security info for client
   */
  @Get('client/:clientId')
  async getByClientId(@Param('clientId') clientId: string, @Request() req) {
    return this.keySecurityService.getByClientId(
      clientId,
      req.user.userId,
      req.user.role
    );
  }

  /**
   * PUT /key-security/:id - Update key security info
   */
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateKeySecurityDto: UpdateKeySecurityDto,
    @Request() req
  ) {
    return this.keySecurityService.update(
      id,
      updateKeySecurityDto,
      req.user.userId,
      req.user.role
    );
  }

  /**
   * DELETE /key-security/:id - Delete key security info
   */
  @Delete(':id')
  async delete(@Param('id') id: string, @Request() req) {
    await this.keySecurityService.delete(id, req.user.userId, req.user.role);
    return { message: 'Key security information deleted successfully' };
  }

  /**
   * GET /key-security/admin/all - Get all key security info (admin only)
   */
  @UseGuards(RolesGuard)
  @Roles('admin')
  @Get('admin/all')
  async getAllForAdmin() {
    return this.keySecurityService.getAllForAdmin();
  }
}
