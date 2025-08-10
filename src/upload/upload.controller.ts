import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  BadRequestException,
  UseGuards,
  Request,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AzureBlobService } from '../azure-blob/azure-blob.service';

@Controller('upload')
export class UploadController {
  constructor(private azureBlobService: AzureBlobService) {}

  @Post('profile-picture')
  @UseInterceptors(FileInterceptor('file'))
  async uploadProfilePicture(
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // Validate file type
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('Only image files are allowed (JPEG, PNG, GIF, WebP)');
    }

    // Validate file size (5MB limit)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      throw new BadRequestException('File size must be less than 5MB');
    }

    try {
      const fileName = this.azureBlobService.generateFileName(file.originalname, 'profile');
      const url = await this.azureBlobService.uploadFile(file, fileName);

      return {
        success: true,
        url,
        fileName,
        originalName: file.originalname,
        size: file.size,
        mimeType: file.mimetype,
      };
    } catch (error) {
      throw new BadRequestException(`Upload failed: ${error.message}`);
    }
  }

  @Post('image')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  async uploadImage(
    @UploadedFile() file: Express.Multer.File,
    @Request() req
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // Validate file type
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('Only image files are allowed (JPEG, PNG, GIF, WebP)');
    }

    // Validate file size (5MB limit)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      throw new BadRequestException('File size must be less than 5MB');
    }

    try {
      const fileName = this.azureBlobService.generateFileName(file.originalname, 'image');
      const url = await this.azureBlobService.uploadFile(file, fileName);

      return {
        success: true,
        url,
        fileName,
        originalName: file.originalname,
        size: file.size,
        mimeType: file.mimetype,
        uploadedBy: req.user.userId,
      };
    } catch (error) {
      throw new BadRequestException(`Upload failed: ${error.message}`);
    }
  }

  @Post('images')
  @UseInterceptors(FilesInterceptor('files', 10)) // Max 10 files
  async uploadMultipleImages(
    @UploadedFiles() files: Express.Multer.File[],
    @Request() req
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files uploaded');
    }

    const uploadPromises = files.map(async (file) => {
      // Validate each file
      const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedMimeTypes.includes(file.mimetype)) {
        throw new BadRequestException(`File ${file.originalname} is not an image`);
      }

      const maxSize = 5 * 1024 * 1024; // 5MB
      if (file.size > maxSize) {
        throw new BadRequestException(`File ${file.originalname} is too large`);
      }

      const fileName = this.azureBlobService.generateFileName(file.originalname, 'image');
      const url = await this.azureBlobService.uploadFile(file, fileName);

      return {
        url,
        fileName,
        originalName: file.originalname,
        size: file.size,
        mimeType: file.mimetype,
      };
    });

    try {
      const results = await Promise.all(uploadPromises);
      return {
        success: true,
        files: results,
        uploadedBy: req.user.userId,
      };
    } catch (error) {
      throw new BadRequestException(`Upload failed: ${error.message}`);
    }
  }

  @Post('pet-photo')
  @UseInterceptors(FileInterceptor('file'))
  async uploadPetPhoto(
    @UploadedFile() file: Express.Multer.File,
    @Request() req
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // Validate file type
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('Only image files are allowed');
    }

    // Validate file size (10MB limit for pet photos)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      throw new BadRequestException('File size must be less than 10MB');
    }

    try {
      const fileName = this.azureBlobService.generateFileName(file.originalname, 'pet');
      const url = await this.azureBlobService.uploadFile(file, fileName);

      return {
        success: true,
        url,
        fileName,
        originalName: file.originalname,
        size: file.size,
        mimeType: file.mimetype,
        uploadedBy: req.user.userId,
        type: 'pet-photo',
      };
    } catch (error) {
      throw new BadRequestException(`Upload failed: ${error.message}`);
    }
  }
}
