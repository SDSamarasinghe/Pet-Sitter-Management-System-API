import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

@Injectable()
export class PaymentsService {
  private stripe: Stripe;

  constructor(private configService: ConfigService) {
    this.stripe = new Stripe(
      this.configService.get<string>('STRIPE_SECRET_KEY'),
      {
        apiVersion: '2023-10-16',
      },
    );
  }

  async createCheckoutSession(
    amount: number,
    description: string,
    userId: string,
  ): Promise<Stripe.Checkout.Session> {
    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'cad',
            product_data: {
              name: 'Other Payment',
              description: description || 'Payment for pet sitting services',
            },
            unit_amount: Math.round(amount * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${this.configService.get<string>('FRONTEND_URL')}/dashboard?tab=booking&payment=success`,
      cancel_url: `${this.configService.get<string>('FRONTEND_URL')}/dashboard?tab=booking&payment=cancelled`,
      metadata: {
        userId,
        description,
        type: 'other_payment',
      },
    });

    return session;
  }

  async retrieveSession(sessionId: string): Promise<Stripe.Checkout.Session> {
    return await this.stripe.checkout.sessions.retrieve(sessionId);
  }
}
