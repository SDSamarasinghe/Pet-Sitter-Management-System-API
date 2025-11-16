import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Note, NoteDocument } from './schemas/note.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { CreateNoteDto, CreateNoteReplyDto, GetNotesQueryDto } from './dto/note.dto';
import { EmailService } from '../email/email.service';

@Injectable()
export class NotesService {
  constructor(
    @InjectModel(Note.name) private noteModel: Model<NoteDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private emailService: EmailService,
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

    const sender = await this.userModel.findById(senderId);
    if (!sender) {
      throw new NotFoundException('Sender not found');
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
    const populatedNote = await this.findNoteById(savedNote._id.toString());

    // Send email notification to recipient
    await this.sendNoteNotification(populatedNote, sender, recipient, 'new');

    // Also notify admin
    await this.notifyAdmin(populatedNote, sender, recipient, 'new');

    return populatedNote;
  }

  /**
   * Get notes for a user (sent or received) - admin can see all notes, others only their own
   */
  async getNotesForUser(
    userId: string, 
    query: GetNotesQueryDto,
    userRole?: string
  ): Promise<{ notes: NoteDocument[], total: number, page: number, limit: number }> {
    const limit = parseInt(query.limit || '20');
    const page = parseInt(query.page || '1');
    const skip = (page - 1) * limit;

    // Build query
    let noteQuery: any = {};

    // Only admin can see all notes, others (client/sitter) only see notes they're involved in
    if (userRole === 'admin') {
      noteQuery = {}; // Empty query to get all notes
      
      // If admin filters by specific recipient, show conversation between any users
      if (query.recipientId) {
        noteQuery = {
          $or: [
            { recipientId: query.recipientId },
            { senderId: query.recipientId }
          ]
        };
      }
    } else {
      // For non-admin users (client/sitter), only show notes they are involved in
      noteQuery = {
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
    }

    const [notes, total] = await Promise.all([
      this.noteModel
        .find(noteQuery)
        .populate('senderId', 'firstName lastName email role profilePicture')
        .populate('recipientId', 'firstName lastName email role profilePicture')
        .populate('replies.senderId', 'firstName lastName email role profilePicture')
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
      .populate('senderId', 'firstName lastName email role profilePicture')
      .populate('recipientId', 'firstName lastName email role profilePicture')
      .populate('replies.senderId', 'firstName lastName email role profilePicture')
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
    createReplyDto: CreateNoteReplyDto,
    userRole?: string
  ): Promise<NoteDocument> {
    
    const note = await this.findNoteById(noteId);
    
    // Get sender and determine recipient
    const sender = await this.userModel.findById(senderId);
    if (!sender) {
      throw new NotFoundException('Sender not found');
    }

    const noteSenderId = (note.senderId as any)._id?.toString() || note.senderId.toString();
    const noteRecipientId = (note.recipientId as any)._id?.toString() || note.recipientId.toString();
    
    const recipientId = senderId === noteSenderId 
      ? noteRecipientId 
      : noteSenderId;
    
    const recipient = await this.userModel.findById(recipientId);
    if (!recipient) {
      throw new NotFoundException('Recipient not found');
    }
    
    const reply = {
      senderId: new Types.ObjectId(senderId),
      text: createReplyDto.text,
      attachments: createReplyDto.attachments || [],
      createdAt: new Date(),
    };
    note.replies.push(reply);
    note.updatedAt = new Date();
    await note.save();
    
    const updatedNote = await this.findNoteById(noteId);

    await this.sendNoteNotification(updatedNote, sender, recipient, 'reply');

    await this.notifyAdmin(updatedNote, sender, recipient, 'reply');

    return updatedNote;
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
      .select('firstName lastName email role profilePicture')
      .sort({ firstName: 1, lastName: 1 })
      .exec();
  }

  /**
   * Get recent notes (for dashboard/overview) - admin can see all notes, others only their own
   */
  async getRecentNotes(userId: string, limit: number = 10, userRole?: string): Promise<NoteDocument[]> {
    
    let query: any = {};
    
    // Only admin can see all notes, others (client/sitter) only see notes they're involved in
    if (userRole === 'admin') {
      query = {}; // Empty query to get all notes
    } else {
      // For non-admin users (client/sitter), only show notes they are involved in
      query = {
        $or: [
          { senderId: userId },
          { recipientId: userId }
        ]
      };
    }
    
    const notes = await this.noteModel
      .find(query)
      .populate('senderId', 'firstName lastName email role profilePicture')
      .populate('recipientId', 'firstName lastName email role profilePicture')
      .populate('replies.senderId', 'firstName lastName email role profilePicture')
      .sort({ updatedAt: -1 })
      .limit(limit)
      .exec();

    // Ensure each reply includes sender name fields
    return notes.map(note => {
      const noteObj = note.toObject();
      if (Array.isArray(noteObj.replies)) {
        noteObj.replies = noteObj.replies.map(reply => {
          // Use type assertion to allow dynamic property
          const r: any = reply;
          const sender: any = r.senderId;
          if (sender && typeof sender === 'object' && (sender.firstName || sender.lastName)) {
            r.senderName = `${sender.firstName || ''} ${sender.lastName || ''}`.trim();
          } else {
            r.senderName = '';
          }
          return r;
        });
      }
      return noteObj;
    });
  }

  /**
   * Send note notification email to recipient
   */
  private async sendNoteNotification(
    note: NoteDocument,
    sender: UserDocument,
    recipient: UserDocument,
    type: 'new' | 'reply'
  ): Promise<void> {
    try {
      const senderName = `${sender.firstName} ${sender.lastName}`;
      const recipientName = `${recipient.firstName} ${recipient.lastName}`;
      const senderRole = sender.role || 'User';
      
      // Get the text (either the note text or the last reply text)
      const messageText = type === 'reply' && note.replies.length > 0
        ? note.replies[note.replies.length - 1].text
        : note.text;

      console.log(`📧 [NOTES SERVICE] Preparing ${type} email notification`);
      console.log(`📧 [NOTES SERVICE] From: ${senderName} (${senderRole})`);
      console.log(`📧 [NOTES SERVICE] To: ${recipient.email}`);

      // Create a mock booking object for the email template
      const mockBooking = {
        _id: note._id,
        startDate: note.createdAt,
        endDate: note.createdAt,
        serviceType: 'Communication Note',
        numberOfPets: 'N/A'
      };

      await this.emailService.sendNoteNotificationEmail(
        mockBooking,
        messageText,
        senderName,
        senderRole.charAt(0).toUpperCase() + senderRole.slice(1),
        recipient.email,
        recipientName
      );

      console.log(`✅ [NOTES SERVICE] ${type} notification email sent to ${recipient.email}`);
    } catch (error) {
      console.error(`❌ [NOTES SERVICE] Failed to send ${type} notification email:`, error);
      console.error(`❌ [NOTES SERVICE] Error details:`, error.message);
      // Don't throw - email failure shouldn't break note creation
    }
  }

  /**
   * Notify admin about new notes/replies
   */
  private async notifyAdmin(
    note: NoteDocument,
    sender: UserDocument,
    recipient: UserDocument,
    type: 'new' | 'reply'
  ): Promise<void> {
    try {
      const adminEmail = process.env.ADMIN_EMAIL || 'admin@whiskarz.com';
      const senderName = `${sender.firstName} ${sender.lastName}`;
      const senderRole = sender.role || 'User';
      
      // Get the text (either the note text or the last reply text)
      const messageText = type === 'reply' && note.replies.length > 0
        ? note.replies[note.replies.length - 1].text
        : note.text;

      console.log(`📧 [NOTES SERVICE] Notifying admin about ${type}`);

      // Create a mock booking object for the email template
      const mockBooking = {
        _id: note._id,
        startDate: note.createdAt,
        endDate: note.createdAt,
        serviceType: 'Communication Note',
        numberOfPets: 'N/A'
      };

      await this.emailService.sendNoteNotificationEmail(
        mockBooking,
        messageText,
        senderName,
        senderRole.charAt(0).toUpperCase() + senderRole.slice(1),
        adminEmail,
        'Admin'
      );

      console.log(`✅ [NOTES SERVICE] Admin notification sent`);
    } catch (error) {
      console.error(`❌ [NOTES SERVICE] Failed to send admin notification:`, error);
      // Don't throw - email failure shouldn't break note creation
    }
  }
}
