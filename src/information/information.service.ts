import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { InformationPage, InformationPageDocument } from './schemas/information-page.schema';
import { CreateInformationPageDto, UpdateInformationPageDto } from './dto/information-page.dto';

@Injectable()
export class InformationService {
  constructor(
    @InjectModel(InformationPage.name) private informationPageModel: Model<InformationPageDocument>,
  ) {}

  /**
   * Create a new information page
   */
  async create(createInformationPageDto: CreateInformationPageDto): Promise<InformationPageDocument> {
    // Check if slug already exists
    const existing = await this.informationPageModel.findOne({ 
      slug: createInformationPageDto.slug 
    });
    
    if (existing) {
      throw new BadRequestException('A page with this slug already exists');
    }

    const page = new this.informationPageModel(createInformationPageDto);
    return page.save();
  }

  /**
   * Get all published information pages
   */
  async getPublishedPages(): Promise<InformationPageDocument[]> {
    return this.informationPageModel
      .find({ isPublished: true })
      .sort({ sortOrder: 1, createdAt: -1 });
  }

  /**
   * Get page by slug
   */
  async getBySlug(slug: string): Promise<InformationPageDocument> {
    const page = await this.informationPageModel.findOne({ 
      slug, 
      isPublished: true 
    });
    
    if (!page) {
      throw new NotFoundException('Page not found');
    }
    
    return page;
  }

  /**
   * Get page by ID
   */
  async getById(id: string): Promise<InformationPageDocument> {
    const page = await this.informationPageModel.findById(id);
    
    if (!page) {
      throw new NotFoundException('Page not found');
    }
    
    return page;
  }

  /**
   * Get pages by type
   */
  async getByType(type: string): Promise<InformationPageDocument[]> {
    return this.informationPageModel
      .find({ type, isPublished: true })
      .sort({ sortOrder: 1, createdAt: -1 });
  }

  /**
   * Update information page
   */
  async update(
    id: string,
    updateInformationPageDto: UpdateInformationPageDto
  ): Promise<InformationPageDocument> {
    const page = await this.informationPageModel.findById(id);
    if (!page) {
      throw new NotFoundException('Page not found');
    }

    // Check if slug is being changed and if it conflicts
    if (updateInformationPageDto.slug && updateInformationPageDto.slug !== page.slug) {
      const existing = await this.informationPageModel.findOne({ 
        slug: updateInformationPageDto.slug,
        _id: { $ne: id }
      });
      
      if (existing) {
        throw new BadRequestException('A page with this slug already exists');
      }
    }

    return this.informationPageModel.findByIdAndUpdate(
      id,
      { ...updateInformationPageDto, updatedAt: new Date() },
      { new: true }
    );
  }

  /**
   * Delete information page
   */
  async delete(id: string): Promise<void> {
    const page = await this.informationPageModel.findById(id);
    if (!page) {
      throw new NotFoundException('Page not found');
    }

    await this.informationPageModel.findByIdAndDelete(id);
  }

  /**
   * Get all pages for admin (including unpublished)
   */
  async getAllForAdmin(): Promise<InformationPageDocument[]> {
    return this.informationPageModel
      .find()
      .sort({ sortOrder: 1, createdAt: -1 });
  }

  /**
   * Get contact information
   */
  async getContactInfo(): Promise<InformationPageDocument> {
    const contactPage = await this.informationPageModel.findOne({ 
      type: 'contact_info',
      isPublished: true 
    });
    
    if (!contactPage) {
      // Return default contact info if none exists
      return new this.informationPageModel({
        slug: 'contact-info',
        title: 'Contact Information',
        content: `
          <h2>Flying Duchess Pet-Sitting Services</h2>
          <p><strong>Phone:</strong> (555) 123-4567</p>
          <p><strong>Email:</strong> info@flyingduchess.com</p>
          <p><strong>Address:</strong> 123 Pet Care Lane, Animal City, AC 12345</p>
          <p><strong>Hours:</strong> Monday - Friday: 8:00 AM - 6:00 PM</p>
          <p><strong>Emergency:</strong> 24/7 Emergency Line: (555) 911-PETS</p>
        `,
        type: 'contact_info',
        isPublished: true,
      });
    }
    
    return contactPage;
  }

  /**
   * Get meet the sitters page
   */
  async getMeetSittersPage(): Promise<InformationPageDocument> {
    const sittersPage = await this.informationPageModel.findOne({ 
      type: 'meet_sitters',
      isPublished: true 
    });
    
    if (!sittersPage) {
      throw new NotFoundException('Meet the Sitters page not found');
    }
    
    return sittersPage;
  }

  /**
   * Get relocation notice
   */
  async getRelocationNotice(): Promise<InformationPageDocument> {
    const relocationPage = await this.informationPageModel.findOne({ 
      type: 'relocation_notice',
      isPublished: true 
    });
    
    if (!relocationPage) {
      throw new NotFoundException('Relocation notice not found');
    }
    
    return relocationPage;
  }

  /**
   * Initialize default pages
   */
  async initializeDefaultPages(): Promise<void> {
    const defaultPages = [
      {
        slug: 'contact-info',
        title: 'Contact Information',
        type: 'contact_info',
        content: `
          <h2>Flying Duchess Pet-Sitting Services</h2>
          <p><strong>Phone:</strong> (555) 123-4567</p>
          <p><strong>Email:</strong> info@flyingduchess.com</p>
          <p><strong>Address:</strong> 123 Pet Care Lane, Animal City, AC 12345</p>
          <p><strong>Hours:</strong> Monday - Friday: 8:00 AM - 6:00 PM</p>
          <p><strong>Emergency:</strong> 24/7 Emergency Line: (555) 911-PETS</p>
        `,
        sortOrder: 1,
      },
      {
        slug: 'meet-the-sitters',
        title: 'Meet Our Professional Pet Sitters',
        type: 'meet_sitters',
        content: `
          <h2>Meet Our Professional Pet Sitters</h2>
          <p>Our team of dedicated pet sitters are carefully screened, trained, and passionate about animal care.</p>
          <p>Each sitter undergoes background checks and is bonded and insured for your peace of mind.</p>
        `,
        sortOrder: 2,
      },
      {
        slug: 'relocation-notice',
        title: 'Relocation Notice',
        type: 'relocation_notice',
        content: `
          <h2>Important Relocation Notice</h2>
          <p>If you are planning to relocate, please notify us at least 30 days in advance.</p>
          <p>This helps us update our service areas and ensure continued care for your pets.</p>
        `,
        sortOrder: 3,
      },
    ];

    for (const pageData of defaultPages) {
      const existing = await this.informationPageModel.findOne({ slug: pageData.slug });
      if (!existing) {
        const page = new this.informationPageModel(pageData);
        await page.save();
      }
    }
  }
}
