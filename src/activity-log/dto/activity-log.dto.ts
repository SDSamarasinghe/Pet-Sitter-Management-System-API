import { IsOptional, IsString, IsEnum, IsMongoId } from 'class-validator';

export class CreateActivityLogDto {
  @IsMongoId()
  userId: string;

  @IsString()
  action: string;

  @IsEnum(['booking', 'pet', 'user', 'invoice', 'report', 'auth', 'system', 'profile'])
  category: string;

  @IsString()
  description: string;

  @IsOptional()
  metadata?: Record<string, any>;

  @IsOptional()
  @IsMongoId()
  targetId?: string;

  @IsOptional()
  @IsString()
  targetType?: string;
}
