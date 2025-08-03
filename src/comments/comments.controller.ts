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
import { CommentsService } from './comments.service';
import { CreateCommentDto, UpdateCommentDto } from './dto/comment.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('comments')
@UseGuards(JwtAuthGuard)
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  /**
   * POST /comments - Create a new comment
   */
  @Post()
  async create(@Body() createCommentDto: CreateCommentDto, @Request() req) {
    return this.commentsService.create(
      createCommentDto,
      req.user.userId,
      req.user.role
    );
  }

  /**
   * GET /comments/booking/:bookingId - Get comments for a booking
   */
  @Get('booking/:bookingId')
  async findByBooking(
    @Param('bookingId') bookingId: string,
    @Request() req,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '50'
  ) {
    return this.commentsService.findByBooking(
      bookingId,
      req.user.userId,
      req.user.role,
      parseInt(page),
      parseInt(limit)
    );
  }

  /**
   * GET /comments/:id - Get comment by ID
   */
  @Get(':id')
  async findById(@Param('id') id: string, @Request() req) {
    return this.commentsService.findById(id, req.user.userId, req.user.role);
  }

  /**
   * PUT /comments/:id - Update a comment
   */
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateCommentDto: UpdateCommentDto,
    @Request() req
  ) {
    return this.commentsService.update(
      id,
      updateCommentDto,
      req.user.userId,
      req.user.role
    );
  }

  /**
   * DELETE /comments/:id - Delete a comment
   */
  @Delete(':id')
  async delete(@Param('id') id: string, @Request() req) {
    await this.commentsService.delete(id, req.user.userId, req.user.role);
    return { message: 'Comment deleted successfully' };
  }

  /**
   * PUT /comments/booking/:bookingId/mark-read - Mark comments as read for a booking
   */
  @Put('booking/:bookingId/mark-read')
  async markAsRead(@Param('bookingId') bookingId: string, @Request() req) {
    return this.commentsService.markAsRead(
      bookingId,
      req.user.userId,
      req.user.role
    );
  }

  /**
   * GET /comments/unread-count - Get unread comment count
   */
  @Get('unread-count')
  async getUnreadCount(@Request() req) {
    const count = await this.commentsService.getUnreadCount(
      req.user.userId,
      req.user.role
    );
    return { unreadCount: count };
  }

  /**
   * GET /comments/recent - Get recent comments for dashboard
   */
  @Get('recent')
  async getRecentComments(
    @Request() req,
    @Query('limit') limit: string = '10'
  ) {
    return this.commentsService.getRecentComments(
      req.user.userId,
      req.user.role,
      parseInt(limit)
    );
  }
}
