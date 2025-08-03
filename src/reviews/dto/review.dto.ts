import { 
  IsString, 
  IsNumber, 
  IsNotEmpty, 
  IsOptional, 
  IsArray, 
  IsEnum, 
  IsMongoId,
  IsBoolean,
  Min,
  Max
} from 'class-validator';

export class CreateReviewDto {
  @IsMongoId()
  @IsNotEmpty()
  revieweeId: string;

  @IsMongoId()
  @IsOptional()
  bookingId?: string;

  @IsNumber()
  @Min(1)
  @Max(5)
  rating: number;

  @IsString()
  @IsNotEmpty()
  comment: string;

  @IsEnum(['client_to_sitter', 'sitter_to_client', 'general'])
  @IsNotEmpty()
  reviewType: string;

  @IsArray()
  @IsOptional()
  tags?: string[];
}

export class UpdateReviewDto {
  @IsNumber()
  @Min(1)
  @Max(5)
  @IsOptional()
  rating?: number;

  @IsString()
  @IsOptional()
  comment?: string;

  @IsArray()
  @IsOptional()
  tags?: string[];

  @IsBoolean()
  @IsOptional()
  isVisible?: boolean;

  @IsBoolean()
  @IsOptional()
  isFeatured?: boolean;

  @IsString()
  @IsOptional()
  adminResponse?: string;
}
