import { 
  Controller, 
  Post, 
  Body, 
  UseGuards, 
  Request,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PaymentsService } from './payments.service';
// import { CreateCheckoutSessionDto } from './dto/create-checkout-session.dto';
import { CreateCheckoutSessionDto } from './dto/create-checkout-session.dto';

@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('create-checkout-session')
  async createCheckoutSession(
    @Body() createCheckoutSessionDto: CreateCheckoutSessionDto,
    @Request() req,
  ) {
    try {
      const { amount, description } = createCheckoutSessionDto;
      const userId = req.user.userId;

      if (!amount || amount <= 0) {
        throw new HttpException(
          'Amount must be greater than 0',
          HttpStatus.BAD_REQUEST,
        );
      }

      const session = await this.paymentsService.createCheckoutSession(
        amount,
        description,
        userId,
      );

      return {
        sessionId: session.id,
        url: session.url,
      };
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to create checkout session',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
