import { BadRequestException } from '@nestjs/common';
import type { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';

export const IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
];

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

export const imageMulterOptions: MulterOptions = {
  limits: {
    fileSize: MAX_IMAGE_BYTES,
    files: 1,
  },
  fileFilter: (_req, file, cb) => {
    if (!IMAGE_MIME_TYPES.includes(file.mimetype)) {
      cb(
        new BadRequestException(
          `Unsupported image type: ${file.mimetype}. Allowed: ${IMAGE_MIME_TYPES.join(', ')}`,
        ),
        false,
      );
      return;
    }
    cb(null, true);
  },
};
