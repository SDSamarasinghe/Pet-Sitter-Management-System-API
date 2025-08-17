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
  HttpStatus,
  ParseArrayPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { AvailabilityService } from './availability.service';
import {
  CreateAvailabilitySettingsDto,
  UpdateAvailabilitySettingsDto,
} from './dto/availability-settings.dto';
import {
  CreateAvailabilitySlotDto,
  UpdateAvailabilitySlotDto,
  AvailabilityCheckDto,
} from './dto/availability-slot.dto';

@Controller('api/availability')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AvailabilityController {
  constructor(private readonly availabilityService: AvailabilityService) {}

  // Availability Settings Endpoints
  @Get('settings/:sitterId')
  @Roles('admin', 'sitter')
  async getSettings(@Param('sitterId') sitterId: string) {
    try {
      const settings = await this.availabilityService.getSettings(sitterId);
      return {
        success: true,
        data: settings,
        message: 'Availability settings retrieved successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        statusCode: HttpStatus.BAD_REQUEST,
      };
    }
  }

  @Post('settings/:sitterId')
  @Roles('admin', 'sitter')
  async createSettings(
    @Param('sitterId') sitterId: string,
    @Body() createDto: CreateAvailabilitySettingsDto,
  ) {
    try {
      const settings = await this.availabilityService.createOrUpdateSettings(
        sitterId,
        createDto,
      );
      return {
        success: true,
        data: settings,
        message: 'Availability settings created successfully',
        statusCode: HttpStatus.CREATED,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        statusCode: HttpStatus.BAD_REQUEST,
      };
    }
  }

  @Put('settings/:sitterId')
  @Roles('admin', 'sitter')
  async updateSettings(
    @Param('sitterId') sitterId: string,
    @Body() updateDto: UpdateAvailabilitySettingsDto,
  ) {
    try {
      console.log('Received update request for sitterId:', sitterId);
      console.log('Raw request body:', JSON.stringify(updateDto, null, 2));
      
      const settings = await this.availabilityService.updateSettings(
        sitterId,
        updateDto,
      );
      return {
        success: true,
        data: settings,
        message: 'Availability settings updated successfully',
      };
    } catch (error) {
      console.error('Error in updateSettings controller:', error);
      return {
        success: false,
        message: error.message,
        statusCode: HttpStatus.BAD_REQUEST,
      };
    }
  }

  // Availability Slots Endpoints
  @Get('slots/:sitterId')
  @Roles('admin', 'sitter', 'client')
  async getSlots(
    @Param('sitterId') sitterId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    try {
      const slots = await this.availabilityService.getSlots(
        sitterId,
        startDate,
        endDate,
      );
      return {
        success: true,
        data: slots,
        message: 'Availability slots retrieved successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        statusCode: HttpStatus.BAD_REQUEST,
      };
    }
  }

  @Post('slots/:sitterId')
  @Roles('admin', 'sitter')
  async createSlot(
    @Param('sitterId') sitterId: string,
    @Body() createDto: CreateAvailabilitySlotDto,
  ) {
    try {
      const slot = await this.availabilityService.createSlot(sitterId, createDto);
      return {
        success: true,
        data: slot,
        message: 'Availability slot created successfully',
        statusCode: HttpStatus.CREATED,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        statusCode: HttpStatus.BAD_REQUEST,
      };
    }
  }

  @Post('slots/:sitterId/bulk')
  @Roles('admin', 'sitter')
  async createMultipleSlots(
    @Param('sitterId') sitterId: string,
    @Body(new ParseArrayPipe({ items: CreateAvailabilitySlotDto }))
    createDtos: CreateAvailabilitySlotDto[],
  ) {
    try {
      const slots = await this.availabilityService.createMultipleSlots(
        sitterId,
        createDtos,
      );
      return {
        success: true,
        data: slots,
        message: `${slots.length} availability slots created successfully`,
        statusCode: HttpStatus.CREATED,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        statusCode: HttpStatus.BAD_REQUEST,
      };
    }
  }

  @Put('slots/:sitterId')
  @Roles('admin', 'sitter')
  async updateMultipleSlots(
    @Param('sitterId') sitterId: string,
    @Body() updateData: { slotId: string; updateDto: UpdateAvailabilitySlotDto }[],
  ) {
    try {
      const updatedSlots = [];
      for (const { slotId, updateDto } of updateData) {
        const slot = await this.availabilityService.updateSlot(
          sitterId,
          slotId,
          updateDto,
        );
        updatedSlots.push(slot);
      }
      return {
        success: true,
        data: updatedSlots,
        message: 'Availability slots updated successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        statusCode: HttpStatus.BAD_REQUEST,
      };
    }
  }

  // Individual Slot Management Endpoints
  @Get('slots/:sitterId/:slotId')
  @Roles('admin', 'sitter', 'client')
  async getSlotById(
    @Param('sitterId') sitterId: string,
    @Param('slotId') slotId: string,
  ) {
    try {
      const slot = await this.availabilityService.getSlotById(sitterId, slotId);
      return {
        success: true,
        data: slot,
        message: 'Availability slot retrieved successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        statusCode: HttpStatus.NOT_FOUND,
      };
    }
  }

  @Put('slots/:sitterId/:slotId')
  @Roles('admin', 'sitter')
  async updateSlot(
    @Param('sitterId') sitterId: string,
    @Param('slotId') slotId: string,
    @Body() updateDto: UpdateAvailabilitySlotDto,
  ) {
    try {
      const slot = await this.availabilityService.updateSlot(
        sitterId,
        slotId,
        updateDto,
      );
      return {
        success: true,
        data: slot,
        message: 'Availability slot updated successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        statusCode: HttpStatus.BAD_REQUEST,
      };
    }
  }

  @Delete('slots/:sitterId/:slotId')
  @Roles('admin', 'sitter')
  async deleteSlot(
    @Param('sitterId') sitterId: string,
    @Param('slotId') slotId: string,
  ) {
    try {
      await this.availabilityService.deleteSlot(sitterId, slotId);
      return {
        success: true,
        message: 'Availability slot deleted successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        statusCode: HttpStatus.NOT_FOUND,
      };
    }
  }

  @Delete('slots/:sitterId/bulk')
  @Roles('admin', 'sitter')
  async deleteMultipleSlots(
    @Param('sitterId') sitterId: string,
    @Body() slotIds: string[],
  ) {
    try {
      const deletedCount = await this.availabilityService.deleteMultipleSlots(
        sitterId,
        slotIds,
      );
      return {
        success: true,
        data: { deletedCount },
        message: `${deletedCount} availability slots deleted successfully`,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        statusCode: HttpStatus.BAD_REQUEST,
      };
    }
  }

  // Availability Check Endpoint
  @Get('check/:sitterId')
  @Roles('admin', 'sitter', 'client')
  async checkAvailability(
    @Param('sitterId') sitterId: string,
    @Query() checkDto: AvailabilityCheckDto,
  ) {
    try {
      const availability = await this.availabilityService.checkAvailability(
        sitterId,
        checkDto,
      );
      return {
        success: true,
        data: availability,
        message: 'Availability check completed successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        statusCode: HttpStatus.BAD_REQUEST,
      };
    }
  }
}
