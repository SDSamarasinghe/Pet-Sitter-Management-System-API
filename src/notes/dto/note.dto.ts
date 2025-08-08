import { IsString, IsNotEmpty, IsOptional, IsArray, ValidateNested, IsMongoId } from 'class-validator';
import { Type } from 'class-transformer';

export class NoteAttachmentDto {
  @IsString()
  @IsNotEmpty()
  type: 'image' | 'document';

  @IsString()
  @IsNotEmpty()
  url: string;

  @IsString()
  @IsNotEmpty()
  filename: string;
}

export class CreateNoteDto {
  @IsMongoId()
  @IsNotEmpty()
  recipientId: string;

  @IsString()
  @IsNotEmpty()
  text: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NoteAttachmentDto)
  attachments?: NoteAttachmentDto[];
}


export class CreateNoteReplyDto {
  @IsString()
  @IsNotEmpty()
  text: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => NoteAttachmentDto)
  attachments?: NoteAttachmentDto[];
}

export class GetNotesQueryDto {
  @IsOptional()
  @IsMongoId()
  recipientId?: string;

  @IsOptional()
  @IsString()
  limit?: string;

  @IsOptional()
  @IsString()
  page?: string;
}
