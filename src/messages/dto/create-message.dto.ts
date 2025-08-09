import { IsString, IsNotEmpty, IsOptional, IsArray, IsEnum, IsMongoId } from 'class-validator';
import { Types } from 'mongoose';

export class CreateMessageDto {
  @IsMongoId()
  @IsNotEmpty()
  receiverId: string;

  @IsString()
  @IsNotEmpty()
  content: string;

  @IsMongoId()
  @IsOptional()
  threadId?: string;

  @IsMongoId()
  @IsOptional()
  replyToId?: string;

  @IsEnum(['message', 'note', 'system'])
  @IsOptional()
  type?: string = 'message';

  @IsArray()
  @IsOptional()
  attachments?: string[];

  @IsString()
  @IsOptional()
  subject?: string; // For creating new thread
}

export class CreateMessageThreadDto {
  @IsArray()
  @IsNotEmpty()
  participantIds: string[];

  @IsString()
  @IsNotEmpty()
  subject: string;

  @IsEnum(['booking', 'general', 'support', 'emergency'])
  @IsOptional()
  category?: string = 'general';

  @IsMongoId()
  @IsOptional()
  relatedBookingId?: string;
}
