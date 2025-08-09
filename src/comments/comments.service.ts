import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Comment, CommentDocument } from './schemas/comment.schema';
import { Booking, BookingDocument } from '../bookings/schemas/booking.schema';
import { User, UserDocument } from '../users/schemas/user.schema';
import { CreateCommentDto, UpdateCommentDto } from './dto/comment.dto';

@Injectable()
export class CommentsService {
  constructor(
    @InjectModel(Comment.name) private commentModel: Model<CommentDocument>,
    @InjectModel(Booking.name) private bookingModel: Model<BookingDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  /**
   * Create a new comment
   */
  async create(
    createCommentDto: CreateCommentDto,
    userId: string,
    userRole: string
  ): Promise<Comment> {
    // Verify booking exists
    const booking = await this.bookingModel.findById(createCommentDto.bookingId).exec();
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // Check permissions - user must be related to the booking
    const canComment = 
      userRole === 'admin' || 
      booking.userId.toString() === userId || 
      booking.sitterId?.toString() === userId;

    if (!canComment) {
      throw new ForbiddenException('You do not have permission to comment on this booking');
    }

    // Only admins can create internal comments
    if (createCommentDto.isInternal && userRole !== 'admin') {
      throw new ForbiddenException('Only admins can create internal comments');
    }

    const comment = new this.commentModel({
      bookingId: createCommentDto.bookingId,
      addedBy: userId,
      body: createCommentDto.body,
      role: userRole,
      attachments: createCommentDto.attachments || [],
      isInternal: createCommentDto.isInternal || false,
      readBy: [{ user: new Types.ObjectId(userId), readAt: new Date() }]
    });

    await comment.save();

    return this.commentModel
      .findById(comment._id)
      .populate('addedBy', 'firstName lastName email')
      .populate('bookingId', 'startDate endDate serviceType')
      .exec();
  }

  /**
   * Get comments for a booking with pagination
   */
  async findByBooking(
    bookingId: string,
    userId: string,
    userRole: string,
    page: number = 1,
    limit: number = 50
  ): Promise<any> {
    // Verify booking exists and user has access
    const booking = await this.bookingModel.findById(bookingId).exec();
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    const canView = 
      userRole === 'admin' || 
      booking.userId.toString() === userId || 
      booking.sitterId?.toString() === userId;

    if (!canView) {
      throw new ForbiddenException('You do not have permission to view comments on this booking');
    }

    // Build query - filter internal comments for non-admin users
    const query: any = { bookingId };
    if (userRole !== 'admin') {
      query.isInternal = false;
    }

    const skip = (page - 1) * limit;

    const [comments, totalCount] = await Promise.all([
      this.commentModel
        .find(query)
        .populate('addedBy', 'firstName lastName email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.commentModel.countDocuments(query).exec()
    ]);

    return {
      comments,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        totalComments: totalCount,
        hasNextPage: skip + limit < totalCount,
        hasPrevPage: page > 1
      }
    };
  }

  /**
   * Update a comment
   */
  async update(
    commentId: string,
    updateCommentDto: UpdateCommentDto,
    userId: string,
    userRole: string
  ): Promise<Comment> {
    const comment = await this.commentModel.findById(commentId).exec();
    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    // Check permissions - only author or admin can update
    if (comment.addedBy.toString() !== userId && userRole !== 'admin') {
      throw new ForbiddenException('You can only update your own comments');
    }

    // Only admins can modify isInternal flag
    if (updateCommentDto.isInternal !== undefined && userRole !== 'admin') {
      delete updateCommentDto.isInternal;
    }

    Object.assign(comment, updateCommentDto);
    comment.updatedAt = new Date();
    await comment.save();

    return this.commentModel
      .findById(commentId)
      .populate('addedBy', 'firstName lastName email')
      .populate('bookingId', 'startDate endDate serviceType')
      .exec();
  }

  /**
   * Delete a comment
   */
  async delete(
    commentId: string,
    userId: string,
    userRole: string
  ): Promise<void> {
    const comment = await this.commentModel.findById(commentId).exec();
    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    // Check permissions - only author or admin can delete
    if (comment.addedBy.toString() !== userId && userRole !== 'admin') {
      throw new ForbiddenException('You can only delete your own comments');
    }

    await this.commentModel.findByIdAndDelete(commentId).exec();
  }

  /**
   * Mark comments as read for a booking
   */
  async markAsRead(
    bookingId: string,
    userId: string,
    userRole: string
  ): Promise<{ message: string }> {
    // Verify booking access
    const booking = await this.bookingModel.findById(bookingId).exec();
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    const canMarkRead = 
      userRole === 'admin' || 
      booking.userId.toString() === userId || 
      booking.sitterId?.toString() === userId;

    if (!canMarkRead) {
      throw new ForbiddenException('You do not have permission to mark comments as read');
    }

    // Build query - exclude internal comments for non-admin users
    const query: any = { bookingId };
    if (userRole !== 'admin') {
      query.isInternal = false;
    }

    // Find comments that haven't been read by this user
    const comments = await this.commentModel.find({
      ...query,
      'readBy.user': { $ne: userId }
    }).exec();

    let updatedCount = 0;
    for (const comment of comments) {
      comment.readBy.push({
        user: new Types.ObjectId(userId),
        readAt: new Date()
      });
      await comment.save();
      updatedCount++;
    }

    return { message: `Marked ${updatedCount} comments as read` };
  }

  /**
   * Get unread comment count for user across all their bookings
   */
  async getUnreadCount(userId: string, userRole: string): Promise<number> {
    // Get bookings where user is involved
    const bookingQuery = {
      $or: [
        { userId: userId },
        { sitterId: userId },
        ...(userRole === 'admin' ? [{}] : []) // Admin can see all bookings
      ]
    };

    const bookings = await this.bookingModel.find(bookingQuery).select('_id').exec();
    const bookingIds = bookings.map(booking => booking._id);

    // Build comment query
    const commentQuery: any = {
      bookingId: { $in: bookingIds },
      'readBy.user': { $ne: userId }
    };

    // Exclude internal comments for non-admin users
    if (userRole !== 'admin') {
      commentQuery.isInternal = false;
    }

    return this.commentModel.countDocuments(commentQuery).exec();
  }

  /**
   * Get recent comments for user's dashboard
   */
  async getRecentComments(
    userId: string,
    userRole: string,
    limit: number = 10
  ): Promise<Comment[]> {
    // Get bookings where user is involved
    const bookingQuery = {
      $or: [
        { userId: userId },
        { sitterId: userId },
        ...(userRole === 'admin' ? [{}] : []) // Admin can see all bookings
      ]
    };

    const bookings = await this.bookingModel.find(bookingQuery).select('_id').exec();
    const bookingIds = bookings.map(booking => booking._id);

    // Build comment query
    const commentQuery: any = {
      bookingId: { $in: bookingIds }
    };

    // Exclude internal comments for non-admin users
    if (userRole !== 'admin') {
      commentQuery.isInternal = false;
    }

    return this.commentModel
      .find(commentQuery)
      .populate('addedBy', 'firstName lastName')
      .populate('bookingId', 'startDate endDate serviceType')
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
  }

  /**
   * Get comment by ID (with permission check)
   */
  async findById(
    commentId: string,
    userId: string,
    userRole: string
  ): Promise<Comment> {
    const comment = await this.commentModel
      .findById(commentId)
      .populate('addedBy', 'firstName lastName email')
      .populate('bookingId', 'startDate endDate serviceType userId sitterId')
      .exec();

    if (!comment) {
      throw new NotFoundException('Comment not found');
    }

    // Check if user has access to this comment
    const booking = comment.bookingId as any;
    const canView = 
      userRole === 'admin' || 
      booking.userId.toString() === userId || 
      booking.sitterId?.toString() === userId;

    if (!canView) {
      throw new ForbiddenException('You do not have permission to view this comment');
    }

    // Hide internal comments from non-admin users
    if (comment.isInternal && userRole !== 'admin') {
      throw new ForbiddenException('You do not have permission to view this comment');
    }

    return comment;
  }
}
