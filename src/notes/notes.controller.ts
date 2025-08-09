import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ValidationPipe,
  UsePipes,
  HttpCode,
  HttpStatus,
  ForbiddenException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { NotesService } from './notes.service';
import { CreateNoteDto, CreateNoteReplyDto, GetNotesQueryDto } from './dto/note.dto';
import { NoteDocument } from './schemas/note.schema';
import { UserDocument } from '../users/schemas/user.schema';
import { Roles } from 'src/auth/roles.decorator';

@Controller('notes')
@UseGuards(JwtAuthGuard)
export class NotesController {
  constructor(private readonly notesService: NotesService) {}

  /**
   * Create a new note
   * POST /notes
   */
  @Post()
  @Roles('admin', 'sitter', 'client')
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async createNote(
    @Request() req,
    @Body() createNoteDto: CreateNoteDto,
  ): Promise<NoteDocument> {
    return this.notesService.createNote(req.user.userId, createNoteDto);
  }

  /**
   * Get available users for note recipients (dropdown)
   * GET /notes/users/available
   */
  @Roles('admin', 'sitter', 'client')
  @Get('users/available')
  async getAvailableUsers(@Request() req): Promise<UserDocument[]> {
    // Use req.user.userId if that's the correct property, and ensure service excludes current user
    return this.notesService.getAvailableUsers(req.user.userId ?? req.user.id);
  }

  /**
   * Get recent notes for dashboard/overview
   * GET /notes/recent/:limit?
   */
  @Roles('admin', 'sitter', 'client')
  @Get('recent/:limit?')
  async getRecentNotes(
    @Request() req,
    @Param('limit') limit?: string,
  ): Promise<NoteDocument[]> {
    const limitNum = limit ? parseInt(limit, 10) : 10;
    return this.notesService.getRecentNotes(req.user.userId, limitNum, req.user.role);
  }

  /**
   * Get notes for the current user
   * GET /notes
   */
  @Roles('admin', 'sitter', 'client')
  @Get()
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
  async getNotes(
    @Request() req,
    @Query() query: GetNotesQueryDto,
  ): Promise<{ notes: NoteDocument[], total: number, page: number, limit: number }> {
    return this.notesService.getNotesForUser(req.user.id, query, req.user.role);
  }

  /**
   * Add a reply to a note
   * POST /notes/:id/replies
   */
  @Roles('admin', 'sitter', 'client')
  @Post(':id/replies')
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async addReply(
    @Request() req,
    @Param('id') noteId: string,
    @Body() createReplyDto: CreateNoteReplyDto,
  ): Promise<NoteDocument> {
    // Pass user role to service so admin can reply to any note
    return this.notesService.addReply(noteId, req.user.userId, createReplyDto, req.user.role);
  }

  /**
   * Get a specific note by ID
   * GET /notes/:id
   */
  @Roles('admin', 'sitter', 'client')
  @Get(':id')
  async getNoteById(
    @Request() req,
    @Param('id') noteId: string,
  ): Promise<NoteDocument> {
    const note = await this.notesService.findNoteById(noteId);
    
    // Admins can view any note, others can only view notes they are involved in
    if (req.user.role !== 'admin' && note.senderId.toString() !== req.user.id && note.recipientId.toString() !== req.user.id) {
      throw new ForbiddenException('You can only view notes you are involved in');
    }
    
    return note;
  }
}
