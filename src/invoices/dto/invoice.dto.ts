import { 
  IsString, 
  IsNumber, 
  IsNotEmpty, 
  IsOptional, 
  IsArray, 
  IsEnum, 
  IsMongoId,
  IsDateString,
  IsBoolean,
  ValidateNested,
  Min
} from 'class-validator';
import { Type } from 'class-transformer';

export class LineItemDto {
  @IsString()
  @IsNotEmpty()
  description: string;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsNumber()
  @Min(1)
  @IsOptional()
  quantity?: number = 1;
}

export class CreateInvoiceDto {
  @IsMongoId()
  @IsNotEmpty()
  clientId: string;

  @IsMongoId()
  @IsOptional()
  bookingId?: string;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsDateString()
  @IsNotEmpty()
  dueDate: string;

  @IsEnum(['service', 'late_fee', 'change_fee', 'cancellation_fee', 'other'])
  @IsNotEmpty()
  type: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LineItemDto)
  @IsOptional()
  lineItems?: LineItemDto[];

  @IsNumber()
  @Min(0)
  @IsOptional()
  subtotal?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  tax?: number = 0;

  @IsNumber()
  @Min(0)
  @IsOptional()
  discount?: number = 0;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class UpdateInvoiceDto {
  @IsNumber()
  @Min(0)
  @IsOptional()
  amount?: number;

  @IsEnum(['pending', 'paid', 'overdue', 'cancelled'])
  @IsOptional()
  status?: string;

  @IsDateString()
  @IsOptional()
  dueDate?: string;

  @IsDateString()
  @IsOptional()
  paidDate?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LineItemDto)
  @IsOptional()
  lineItems?: LineItemDto[];

  @IsNumber()
  @Min(0)
  @IsOptional()
  subtotal?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  tax?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  discount?: number;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsEnum(['credit_card', 'bank_transfer', 'cash', 'check'])
  @IsOptional()
  paymentMethod?: string;

  @IsString()
  @IsOptional()
  paymentReference?: string;
}

export class PayInvoiceDto {
  @IsEnum(['credit_card', 'bank_transfer', 'cash', 'check'])
  @IsNotEmpty()
  paymentMethod: string;

  @IsString()
  @IsOptional()
  paymentReference?: string;

  @IsDateString()
  @IsOptional()
  paidDate?: string;
}
