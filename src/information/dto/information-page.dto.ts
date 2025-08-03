import { 
  IsString, 
  IsNotEmpty, 
  IsOptional, 
  IsArray, 
  IsEnum, 
  IsBoolean,
  IsNumber
} from 'class-validator';

export class CreateInformationPageDto {
  @IsString()
  @IsNotEmpty()
  slug: string;

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  content: string;

  @IsString()
  @IsOptional()
  excerpt?: string;

  @IsEnum(['relocation_notice', 'meet_sitters', 'contact_info', 'about_us', 'privacy_policy', 'terms_of_service', 'faq'])
  @IsNotEmpty()
  type: string;

  @IsBoolean()
  @IsOptional()
  isPublished?: boolean = true;

  @IsNumber()
  @IsOptional()
  sortOrder?: number = 0;

  @IsString()
  @IsOptional()
  metaTitle?: string;

  @IsString()
  @IsOptional()
  metaDescription?: string;

  @IsArray()
  @IsOptional()
  images?: string[];
}

export class UpdateInformationPageDto {
  @IsString()
  @IsOptional()
  slug?: string;

  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  content?: string;

  @IsString()
  @IsOptional()
  excerpt?: string;

  @IsEnum(['relocation_notice', 'meet_sitters', 'contact_info', 'about_us', 'privacy_policy', 'terms_of_service', 'faq'])
  @IsOptional()
  type?: string;

  @IsBoolean()
  @IsOptional()
  isPublished?: boolean;

  @IsNumber()
  @IsOptional()
  sortOrder?: number;

  @IsString()
  @IsOptional()
  metaTitle?: string;

  @IsString()
  @IsOptional()
  metaDescription?: string;

  @IsArray()
  @IsOptional()
  images?: string[];
}
