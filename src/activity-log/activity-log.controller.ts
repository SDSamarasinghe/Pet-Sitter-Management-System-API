import { Controller, Get, Post, Put, Query, Param, Body, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { ActivityLogService } from './activity-log.service';

@Controller('activity-log')
@UseGuards(JwtAuthGuard)
export class ActivityLogController {
  constructor(private readonly activityLogService: ActivityLogService) {}

  // Get all logs (admin only)
  @Get()
  @UseGuards(RolesGuard)
  @Roles('admin')
  async findAll(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.activityLogService.findAll(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 50,
    );
  }

  // Get current user's logs
  @Get('my')
  async findMyLogs(@Req() req: any, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.activityLogService.findByUser(
      req.user.userId,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 50,
    );
  }

  // Get logs for specific user (admin only)
  @Get('user/:userId')
  @UseGuards(RolesGuard)
  @Roles('admin')
  async findByUser(@Param('userId') userId: string, @Query('page') page?: string, @Query('limit') limit?: string) {
    return this.activityLogService.findByUser(
      userId,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 50,
    );
  }

  // Get unread notification count
  @Get('unread-count')
  async getUnreadCount(@Req() req: any) {
    const count = await this.activityLogService.getUnreadCount(req.user.userId);
    return { count };
  }

  // Get recent notifications for the current user
  @Get('notifications')
  async getNotifications(@Req() req: any, @Query('limit') limit?: string) {
    return this.activityLogService.getRecentNotifications(
      req.user.userId,
      limit ? parseInt(limit, 10) : 20,
    );
  }

  // Mark specific notifications as read
  @Put('mark-read')
  async markAsRead(@Req() req: any, @Body('logIds') logIds?: string[]) {
    await this.activityLogService.markAsRead(req.user.userId, logIds);
    return { success: true };
  }

  // Mark all as read
  @Put('mark-all-read')
  async markAllAsRead(@Req() req: any) {
    await this.activityLogService.markAllAsRead(req.user.userId);
    return { success: true };
  }
}
