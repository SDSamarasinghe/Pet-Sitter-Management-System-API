import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Message, MessageDocument } from './schemas/message.schema';
import { MessageThread, MessageThreadDocument } from './schemas/message-thread.schema';
import { CreateMessageDto, CreateMessageThreadDto } from './dto/create-message.dto';

@Injectable()
export class MessagesService {
  constructor(
    @InjectModel(Message.name) private messageModel: Model<MessageDocument>,
    @InjectModel(MessageThread.name) private threadModel: Model<MessageThreadDocument>,
  ) {}

  /**
   * Create a new message thread
   */
  async createThread(createThreadDto: CreateMessageThreadDto, currentUserId: string): Promise<MessageThreadDocument> {
    const participantIds = [...new Set([...createThreadDto.participantIds, currentUserId])];
    
    const thread = new this.threadModel({
      ...createThreadDto,
      participants: participantIds.map(id => new Types.ObjectId(id)),
    });

    return thread.save();
  }

  /**
   * Send a message (create new thread if needed)
   */
  async sendMessage(createMessageDto: CreateMessageDto, currentUserId: string): Promise<MessageDocument> {
    let threadId = createMessageDto.threadId;

    // If no thread specified, create a new one or find existing
    if (!threadId) {
      if (createMessageDto.subject) {
        const thread = await this.createThread({
          participantIds: [createMessageDto.receiverId],
          subject: createMessageDto.subject,
          category: 'general'
        }, currentUserId);
        threadId = thread._id.toString();
      } else {
        throw new Error('Thread ID or subject is required for new messages');
      }
    }

    // Verify user is participant in thread
    const thread = await this.threadModel.findById(threadId);
    if (!thread) {
      throw new NotFoundException('Thread not found');
    }

    const isParticipant = thread.participants.some(p => p.toString() === currentUserId);
    if (!isParticipant) {
      throw new ForbiddenException('You are not a participant in this thread');
    }

    const message = new this.messageModel({
      senderId: new Types.ObjectId(currentUserId),
      receiverId: new Types.ObjectId(createMessageDto.receiverId),
      threadId: new Types.ObjectId(threadId),
      content: createMessageDto.content,
      replyToId: createMessageDto.replyToId ? new Types.ObjectId(createMessageDto.replyToId) : undefined,
      type: createMessageDto.type || 'message',
      attachments: createMessageDto.attachments,
    });

    const savedMessage = await message.save();

    // Update thread's last activity
    await this.threadModel.findByIdAndUpdate(threadId, {
      lastMessageId: savedMessage._id,
      lastActivity: new Date(),
    });

    return savedMessage;
  }

  /**
   * Get user's message threads with pagination
   */
  async getUserThreads(
    userId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ threads: MessageThreadDocument[]; total: number }> {
    const skip = (page - 1) * limit;

    const [threads, total] = await Promise.all([
      this.threadModel
        .find({ 
          participants: new Types.ObjectId(userId),
          isArchived: false
        })
        .populate('participants', 'firstName lastName email role profilePicture')
        .populate('lastMessageId')
        .sort({ lastActivity: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.threadModel.countDocuments({ 
        participants: new Types.ObjectId(userId),
        isArchived: false
      }),
    ]);

    return { threads, total };
  }

  /**
   * Get messages in a thread with pagination
   */
  async getThreadMessages(
    threadId: string,
    userId: string,
    page: number = 1,
    limit: number = 50
  ): Promise<{ messages: MessageDocument[]; total: number }> {
    // Verify user is participant
    const thread = await this.threadModel.findById(threadId);
    if (!thread) {
      throw new NotFoundException('Thread not found');
    }

    const isParticipant = thread.participants.some(p => p.toString() === userId);
    if (!isParticipant) {
      throw new ForbiddenException('You are not a participant in this thread');
    }

    const skip = (page - 1) * limit;

    const [messages, total] = await Promise.all([
      this.messageModel
        .find({ 
          threadId: new Types.ObjectId(threadId),
          isDeleted: false
        })
        .populate('senderId', 'firstName lastName email role profilePicture')
        .populate('receiverId', 'firstName lastName email role profilePicture')
        .populate('replyToId')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.messageModel.countDocuments({ 
        threadId: new Types.ObjectId(threadId),
        isDeleted: false
      }),
    ]);

    return { messages: messages.reverse(), total }; // Reverse to show oldest first
  }

  /**
   * Mark messages as read
   */
  async markMessagesAsRead(threadId: string, userId: string): Promise<void> {
    await this.messageModel.updateMany(
      {
        threadId: new Types.ObjectId(threadId),
        receiverId: new Types.ObjectId(userId),
        isRead: false,
      },
      {
        isRead: true,
        readAt: new Date(),
      }
    );
  }

  /**
   * Get unread message count for user
   */
  async getUnreadCount(userId: string): Promise<number> {
    return this.messageModel.countDocuments({
      receiverId: new Types.ObjectId(userId),
      isRead: false,
      isDeleted: false,
    });
  }

  /**
   * Search messages
   */
  async searchMessages(
    userId: string,
    query: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ messages: MessageDocument[]; total: number }> {
    const userThreads = await this.threadModel.find({
      participants: new Types.ObjectId(userId)
    }).select('_id');

    const threadIds = userThreads.map(t => t._id);
    const skip = (page - 1) * limit;

    const [messages, total] = await Promise.all([
      this.messageModel
        .find({
          threadId: { $in: threadIds },
          content: { $regex: query, $options: 'i' },
          isDeleted: false,
        })
        .populate('senderId', 'firstName lastName email role')
        .populate('threadId', 'subject')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.messageModel.countDocuments({
        threadId: { $in: threadIds },
        content: { $regex: query, $options: 'i' },
        isDeleted: false,
      }),
    ]);

    return { messages, total };
  }

  /**
   * Archive a thread
   */
  async archiveThread(threadId: string, userId: string): Promise<MessageThreadDocument> {
    const thread = await this.threadModel.findById(threadId);
    if (!thread) {
      throw new NotFoundException('Thread not found');
    }

    const isParticipant = thread.participants.some(p => p.toString() === userId);
    if (!isParticipant) {
      throw new ForbiddenException('You are not a participant in this thread');
    }

    return this.threadModel.findByIdAndUpdate(
      threadId,
      { isArchived: true },
      { new: true }
    );
  }

  /**
   * Delete a message (soft delete)
   */
  async deleteMessage(messageId: string, userId: string): Promise<MessageDocument> {
    const message = await this.messageModel.findById(messageId);
    if (!message) {
      throw new NotFoundException('Message not found');
    }

    if (message.senderId.toString() !== userId) {
      throw new ForbiddenException('You can only delete your own messages');
    }

    return this.messageModel.findByIdAndUpdate(
      messageId,
      { isDeleted: true },
      { new: true }
    );
  }
}
