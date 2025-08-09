import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Review, ReviewDocument } from './schemas/review.schema';
import { CreateReviewDto, UpdateReviewDto } from './dto/review.dto';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectModel(Review.name) private reviewModel: Model<ReviewDocument>,
  ) {}

  /**
   * Create a new review
   */
  async create(
    createReviewDto: CreateReviewDto,
    currentUserId: string
  ): Promise<ReviewDocument> {
    // Check if user has already reviewed this person for this booking
    if (createReviewDto.bookingId) {
      const existingReview = await this.reviewModel.findOne({
        reviewerId: new Types.ObjectId(currentUserId),
        revieweeId: new Types.ObjectId(createReviewDto.revieweeId),
        bookingId: new Types.ObjectId(createReviewDto.bookingId),
      });

      if (existingReview) {
        throw new BadRequestException('You have already reviewed this booking');
      }
    }

    const review = new this.reviewModel({
      ...createReviewDto,
      reviewerId: new Types.ObjectId(currentUserId),
      revieweeId: new Types.ObjectId(createReviewDto.revieweeId),
      bookingId: createReviewDto.bookingId ? new Types.ObjectId(createReviewDto.bookingId) : undefined,
    });

    return review.save();
  }

  /**
   * Get reviews for a specific user (sitter or client)
   */
  async getReviewsForUser(
    userId: string,
    page: number = 1,
    limit: number = 20,
    reviewType?: string
  ): Promise<{ reviews: ReviewDocument[]; total: number; averageRating: number }> {
    const filter: any = { 
      revieweeId: new Types.ObjectId(userId),
      isVisible: true 
    };
    
    if (reviewType) {
      filter.reviewType = reviewType;
    }

    const skip = (page - 1) * limit;

    const [reviews, total, avgResult] = await Promise.all([
      this.reviewModel
        .find(filter)
        .populate('reviewerId', 'firstName lastName profilePicture')
        .populate('bookingId', 'serviceType startDate endDate')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.reviewModel.countDocuments(filter),
      this.reviewModel.aggregate([
        { $match: filter },
        { $group: { _id: null, averageRating: { $avg: '$rating' } } }
      ])
    ]);

    const averageRating = avgResult.length > 0 ? Math.round(avgResult[0].averageRating * 10) / 10 : 0;

    return { reviews, total, averageRating };
  }

  /**
   * Get reviews written by a user
   */
  async getReviewsByUser(
    userId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ reviews: ReviewDocument[]; total: number }> {
    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      this.reviewModel
        .find({ reviewerId: new Types.ObjectId(userId) })
        .populate('revieweeId', 'firstName lastName profilePicture')
        .populate('bookingId', 'serviceType startDate endDate')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.reviewModel.countDocuments({ reviewerId: new Types.ObjectId(userId) }),
    ]);

    return { reviews, total };
  }

  /**
   * Get a specific review by ID
   */
  async getById(id: string): Promise<ReviewDocument> {
    const review = await this.reviewModel
      .findById(id)
      .populate('reviewerId', 'firstName lastName profilePicture')
      .populate('revieweeId', 'firstName lastName profilePicture')
      .populate('bookingId', 'serviceType startDate endDate');

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    return review;
  }

  /**
   * Update a review
   */
  async update(
    id: string,
    updateReviewDto: UpdateReviewDto,
    currentUserId: string,
    currentUserRole: string
  ): Promise<ReviewDocument> {
    const review = await this.reviewModel.findById(id);
    if (!review) {
      throw new NotFoundException('Review not found');
    }

    // Only the reviewer or admin can update the review content
    if (review.reviewerId.toString() !== currentUserId && currentUserRole !== 'admin') {
      throw new ForbiddenException('You can only update your own reviews');
    }

    // Only admin can update visibility and featured status
    if (currentUserRole !== 'admin') {
      delete updateReviewDto.isVisible;
      delete updateReviewDto.isFeatured;
      delete updateReviewDto.adminResponse;
    }

    return this.reviewModel.findByIdAndUpdate(
      id,
      { ...updateReviewDto, updatedAt: new Date() },
      { new: true }
    ).populate('reviewerId', 'firstName lastName profilePicture');
  }

  /**
   * Delete a review
   */
  async delete(
    id: string,
    currentUserId: string,
    currentUserRole: string
  ): Promise<void> {
    const review = await this.reviewModel.findById(id);
    if (!review) {
      throw new NotFoundException('Review not found');
    }

    // Only the reviewer or admin can delete
    if (review.reviewerId.toString() !== currentUserId && currentUserRole !== 'admin') {
      throw new ForbiddenException('You can only delete your own reviews');
    }

    await this.reviewModel.findByIdAndDelete(id);
  }

  /**
   * Get featured reviews for homepage
   */
  async getFeaturedReviews(): Promise<ReviewDocument[]> {
    return this.reviewModel
      .find({ isFeatured: true, isVisible: true })
      .populate('reviewerId', 'firstName lastName profilePicture')
      .populate('revieweeId', 'firstName lastName profilePicture')
      .sort({ createdAt: -1 })
      .limit(10);
  }

  /**
   * Get all reviews (admin only)
   */
  async getAllForAdmin(
    page: number = 1,
    limit: number = 20,
    filter?: any
  ): Promise<{ reviews: ReviewDocument[]; total: number }> {
    const skip = (page - 1) * limit;
    const query = filter || {};

    const [reviews, total] = await Promise.all([
      this.reviewModel
        .find(query)
        .populate('reviewerId', 'firstName lastName email')
        .populate('revieweeId', 'firstName lastName email')
        .populate('bookingId', 'serviceType startDate endDate')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.reviewModel.countDocuments(query),
    ]);

    return { reviews, total };
  }

  /**
   * Get review statistics
   */
  async getReviewStats(userId?: string): Promise<any> {
    const matchFilter = userId ? { revieweeId: new Types.ObjectId(userId) } : {};

    const stats = await this.reviewModel.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: '$rating',
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const totalReviews = await this.reviewModel.countDocuments(matchFilter);
    const avgRating = await this.reviewModel.aggregate([
      { $match: matchFilter },
      { $group: { _id: null, averageRating: { $avg: '$rating' } } }
    ]);

    return {
      totalReviews,
      averageRating: avgRating.length > 0 ? Math.round(avgRating[0].averageRating * 10) / 10 : 0,
      ratingDistribution: stats,
    };
  }
}
