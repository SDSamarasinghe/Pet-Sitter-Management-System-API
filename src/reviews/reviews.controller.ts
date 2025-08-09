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
import { ReviewsService } from './reviews.service';
import { CreateReviewDto, UpdateReviewDto } from './dto/review.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  /**
   * POST /reviews - Create a new review
   */
  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@Body() createReviewDto: CreateReviewDto, @Request() req) {
    return this.reviewsService.create(createReviewDto, req.user.userId);
  }

  /**
   * GET /reviews/user/:userId - Get reviews for a specific user
   */
  @Get('user/:userId')
  async getReviewsForUser(
    @Param('userId') userId: string,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @Query('type') reviewType?: string
  ) {
    return this.reviewsService.getReviewsForUser(
      userId,
      parseInt(page),
      parseInt(limit),
      reviewType
    );
  }

  /**
   * GET /reviews/by-user/:userId - Get reviews written by a user
   */
  @UseGuards(JwtAuthGuard)
  @Get('by-user/:userId')
  async getReviewsByUser(
    @Param('userId') userId: string,
    @Request() req,
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20'
  ) {
    // Users can only see their own written reviews unless they're admin
    if (userId !== req.user.userId && req.user.role !== 'admin') {
      userId = req.user.userId;
    }
    
    return this.reviewsService.getReviewsByUser(
      userId,
      parseInt(page),
      parseInt(limit)
    );
  }

  /**
   * GET /reviews/featured - Get featured reviews for homepage
   */
  @Get('featured')
  async getFeaturedReviews() {
    return this.reviewsService.getFeaturedReviews();
  }

  /**
   * GET /reviews/:id - Get a specific review
   */
  @Get(':id')
  async getById(@Param('id') id: string) {
    return this.reviewsService.getById(id);
  }

  /**
   * PUT /reviews/:id - Update a review
   */
  @UseGuards(JwtAuthGuard)
  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateReviewDto: UpdateReviewDto,
    @Request() req
  ) {
    return this.reviewsService.update(
      id,
      updateReviewDto,
      req.user.userId,
      req.user.role
    );
  }

  /**
   * DELETE /reviews/:id - Delete a review
   */
  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async delete(@Param('id') id: string, @Request() req) {
    await this.reviewsService.delete(id, req.user.userId, req.user.role);
    return { message: 'Review deleted successfully' };
  }

  /**
   * GET /reviews/admin/all - Get all reviews (admin only)
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get('admin/all')
  async getAllForAdmin(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '20',
    @Query('visible') visible?: string,
    @Query('rating') rating?: string
  ) {
    const filter: any = {};
    if (visible !== undefined) {
      filter.isVisible = visible === 'true';
    }
    if (rating) {
      filter.rating = parseInt(rating);
    }

    return this.reviewsService.getAllForAdmin(
      parseInt(page),
      parseInt(limit),
      filter
    );
  }

  /**
   * GET /reviews/stats/:userId? - Get review statistics
   */
  @Get('stats/:userId?')
  async getReviewStats(@Param('userId') userId?: string) {
    return this.reviewsService.getReviewStats(userId);
  }
}
