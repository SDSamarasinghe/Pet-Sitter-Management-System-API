import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type InformationPageDocument = InformationPage & Document;

@Schema({ timestamps: true })
export class InformationPage {
  @Prop({ required: true, unique: true })
  slug: string; // URL-friendly identifier

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  content: string; // HTML content

  @Prop()
  excerpt: string; // Short description

  @Prop({ 
    enum: ['relocation_notice', 'meet_sitters', 'contact_info', 'about_us', 'privacy_policy', 'terms_of_service', 'faq'], 
    required: true 
  })
  type: string;

  @Prop({ default: true })
  isPublished: boolean;

  @Prop({ default: 0 })
  sortOrder: number; // For ordering pages

  @Prop()
  metaTitle: string; // SEO meta title

  @Prop()
  metaDescription: string; // SEO meta description

  @Prop({ type: [String] })
  images: string[]; // Cloudinary URLs for images

  @Prop({ default: Date.now })
  createdAt: Date;

  @Prop({ default: Date.now })
  updatedAt: Date;
}

export const InformationPageSchema = SchemaFactory.createForClass(InformationPage);
