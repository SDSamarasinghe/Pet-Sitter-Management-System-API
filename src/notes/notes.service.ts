import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Note, NoteDocument } from './schemas/note.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { CreateNoteDto, CreateNoteReplyDto, GetNotesQueryDto } from './dto/note.dto';

@Injectable()
export class NotesService {
  constructor(
    @InjectModel(Note.name) private noteModel: Model<NoteDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  /**
   * Create a new note
   */
  async createNote(senderId: string, createNoteDto: CreateNoteDto): Promise<NoteDocument> {
    // Verify recipient exists
    const recipient = await this.userModel.findById(createNoteDto.recipientId);
    if (!recipient) {
      throw new NotFoundException('Recipient not found');
    }

    // Don't allow sending notes to self
    if (senderId === createNoteDto.recipientId) {
      throw new ForbiddenException('Cannot send note to yourself');
    }

    const note = new this.noteModel({
      senderId,
      recipientId: createNoteDto.recipientId,
      text: createNoteDto.text,
      attachments: createNoteDto.attachments || [],
    });
    


    const savedNote = await note.save();
    return this.findNoteById(savedNote._id.toString());
  }

  /**
   * Get notes for a user (sent or received)
   */
  async getNotesForUser(
    userId: string, 
    query: GetNotesQueryDto
  ): Promise<{ notes: NoteDocument[], total: number, page: number, limit: number }> {
    const limit = parseInt(query.limit || '20');
    const page = parseInt(query.page || '1');
    const skip = (page - 1) * limit;

    // Build query - get notes where user is sender or recipient
    let noteQuery: any = {
      $or: [
        { senderId: userId },
        { recipientId: userId }
      ]
    };

    // Filter by specific recipient if provided
    if (query.recipientId) {
      noteQuery = {
        $or: [
          { senderId: userId, recipientId: query.recipientId },
          { senderId: query.recipientId, recipientId: userId }
        ]
      };
    }

    const [notes, total] = await Promise.all([
      this.noteModel
        .find(noteQuery)
        .populate('senderId', 'firstName lastName email role')
        .populate('recipientId', 'firstName lastName email role')
        .populate('replies.senderId', 'firstName lastName email role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.noteModel.countDocuments(noteQuery).exec()
    ]);

    return {
      notes,
      total,
      page,
      limit
    };
  }

  /**
   * Get a specific note by ID
   */
  async findNoteById(noteId: string): Promise<NoteDocument> {
    const note = await this.noteModel
      .findById(noteId)
      .populate('senderId', 'firstName lastName email role')
      .populate('recipientId', 'firstName lastName email role')
      .populate('replies.senderId', 'firstName lastName email role')
      .exec();

    if (!note) {
      throw new NotFoundException('Note not found');
    }

    return note;
  }

  /**
   * Add a reply to a note
   */
  async addReply(
    noteId: string, 
    senderId: string, 
    createReplyDto: CreateNoteReplyDto
  ): Promise<NoteDocument> {
    const note = await this.findNoteById(noteId);
    
    // Verify user can reply (must be sender or recipient of original note)
    const senderIdStr = senderId.toString();
    const noteSenderIdStr = note.senderId?.toString();
    const noteRecipientIdStr = note.recipientId?.toString();
    // if (noteSenderIdStr !== senderIdStr && noteRecipientIdStr !== senderIdStr) {
    //   throw new ForbiddenException('You can only reply to notes you are involved in');
    // }

    const reply = {
      senderId: new Types.ObjectId(senderId),
      text: createReplyDto.text,
      attachments: createReplyDto.attachments || [],
      createdAt: new Date(),
    };

    note.replies.push(reply);
    note.updatedAt = new Date();
    
    await note.save();
    return this.findNoteById(noteId);
  }

  /**
   * Get all users (for dropdown selection)
   */
  async getAvailableUsers(currentUserId: string): Promise<UserDocument[]> {
    return this.userModel
      .find({ 
        _id: { $ne: currentUserId },
        status: 'active',
        // role: 'client',
      })
      .select('firstName lastName email role')
      .sort({ firstName: 1, lastName: 1 })
      .exec();
  }

  /**
   * Get recent notes (for dashboard/overview)
   */
  async getRecentNotes(userId: string, limit: number = 10): Promise<NoteDocument[]> {
    return this.noteModel
      .find({
        $or: [
          { senderId: userId },
          { recipientId: userId }
        ]
      })
      .populate('senderId', 'firstName lastName email role')
      .populate('recipientId', 'firstName lastName email role')
      .sort({ updatedAt: -1 })
      .limit(limit)
      .exec();
  }
}
