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
import { MessagesService } from './messages.service';
import { CreateMessageDto, CreateMessageThreadDto } from './dto/create-message.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('messages')
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  /**
   * POST /messages/threads - Create a new message thread
   */
  @Post('threads')
  async createThread(@Body() createThreadDto: CreateMessageThreadDto, @Request() req) {
    return this.messagesService.createThread(createThreadDto, req.user.userId);
  }

  /**
   * POST /messages - Send a message
   */
  @Post()
  async sendMessage(@Body() createMessageDto: CreateMessageDto, @Request() req) {
    return this.messagesService.sendMessage(createMessageDto, req.user.userId);
  }

  /**
   * GET /messages/threads - Get user's message threads
   */
  @Get('threads')
  async getUserThreads(
    @Request() req,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20'
  ) {
    return this.messagesService.getUserThreads(
      req.user.userId,
      parseInt(page),
      parseInt(limit)
    );
  }

  /**
   * GET /messages/threads/:threadId - Get messages in a thread
   */
  @Get('threads/:threadId')
  async getThreadMessages(
    @Param('threadId') threadId: string,
    @Request() req,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '50'
  ) {
    return this.messagesService.getThreadMessages(
      threadId,
      req.user.userId,
      parseInt(page),
      parseInt(limit)
    );
  }

  /**
   * PUT /messages/threads/:threadId/read - Mark messages as read
   */
  @Put('threads/:threadId/read')
  async markAsRead(@Param('threadId') threadId: string, @Request() req) {
    await this.messagesService.markMessagesAsRead(threadId, req.user.userId);
    return { message: 'Messages marked as read' };
  }

  /**
   * GET /messages/unread-count - Get unread message count
   */
  @Get('unread-count')
  async getUnreadCount(@Request() req) {
    const count = await this.messagesService.getUnreadCount(req.user.userId);
    return { unreadCount: count };
  }

  /**
   * GET /messages/search - Search messages
   */
  @Get('search')
  async searchMessages(
    @Request() req,
    @Query('q') query: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20'
  ) {
    return this.messagesService.searchMessages(
      req.user.userId,
      query,
      parseInt(page),
      parseInt(limit)
    );
  }

  /**
   * PUT /messages/threads/:threadId/archive - Archive a thread
   */
  @Put('threads/:threadId/archive')
  async archiveThread(@Param('threadId') threadId: string, @Request() req) {
    return this.messagesService.archiveThread(threadId, req.user.userId);
  }

  /**
   * DELETE /messages/:messageId - Delete a message
   */
  @Delete(':messageId')
  async deleteMessage(@Param('messageId') messageId: string, @Request() req) {
    return this.messagesService.deleteMessage(messageId, req.user.userId);
  }
}
