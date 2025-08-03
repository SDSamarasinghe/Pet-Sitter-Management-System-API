import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type InvoiceDocument = Invoice & Document;

@Schema({ timestamps: true })
export class Invoice {
  @Prop({ required: true, unique: true })
  invoiceNumber: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  clientId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Booking' })
  bookingId?: Types.ObjectId;

  @Prop({ required: true })
  amount: number;

  @Prop({ 
    enum: ['pending', 'paid', 'overdue', 'cancelled'], 
    default: 'pending' 
  })
  status: string;

  @Prop({ required: true })
  dueDate: Date;

  @Prop()
  paidDate?: Date;

  @Prop({ 
    enum: ['service', 'late_fee', 'change_fee', 'cancellation_fee', 'other'], 
    required: true 
  })
  type: string;

  @Prop()
  description: string;

  @Prop({ type: [{ 
    description: String, 
    amount: Number, 
    quantity: { type: Number, default: 1 }
  }] })
  lineItems: {
    description: string;
    amount: number;
    quantity: number;
  }[];

  @Prop()
  subtotal: number;

  @Prop({ default: 0 })
  tax: number;

  @Prop({ default: 0 })
  discount: number;

  @Prop()
  notes: string;

  @Prop({ 
    enum: ['credit_card', 'bank_transfer', 'cash', 'check'], 
  })
  paymentMethod?: string;

  @Prop()
  paymentReference?: string; // Transaction ID, check number, etc.

  @Prop()
  pdfUrl?: string; // URL to generated PDF invoice

  @Prop({ default: false })
  emailSent: boolean;

  @Prop()
  emailSentDate?: Date;

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const InvoiceSchema = SchemaFactory.createForClass(Invoice);
