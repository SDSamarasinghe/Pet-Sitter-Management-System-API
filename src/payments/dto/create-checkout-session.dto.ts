import { IsNumber, IsString, IsOptional, Min } from 'class-validator';

export class CreateCheckoutSessionDto {
  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsString()
  @IsOptional()
  description?: string;
}
