import { Module } from '@nestjs/common';
import { UploadController } from './upload.controller';
import { AzureBlobModule } from '../azure-blob/azure-blob.module';

@Module({
  imports: [AzureBlobModule],
  controllers: [UploadController],
})
export class UploadModule {}
