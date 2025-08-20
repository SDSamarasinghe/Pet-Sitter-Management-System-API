import { Injectable } from '@nestjs/common';
import { BlobServiceClient, ContainerClient, generateBlobSASQueryParameters, BlobSASPermissions, StorageSharedKeyCredential } from '@azure/storage-blob';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AzureBlobService {
  private blobServiceClient: BlobServiceClient;
  private containerClient: ContainerClient;
  private accountName: string;
  private accountKey: string;

  constructor(private configService: ConfigService) {
    const connectionString = this.configService.get<string>('AZURE_STORAGE_CONNECTION_STRING');
    const containerName = this.configService.get<string>('AZURE_STORAGE_CONTAINER_NAME') || 'pet-images';
    
    // Check if connection string is valid before proceeding
    if (!connectionString || connectionString.trim() === '' || connectionString === '${AZURE_STORAGE_CONNECTION_STRING}') {
      console.warn('Azure Storage connection string is not configured properly. Azure Blob functionality will be disabled.');
      this.blobServiceClient = null;
      this.containerClient = null;
      this.accountName = '';
      this.accountKey = '';
      return;
    }
    
    try {
      // Extract account name and key from connection string for SAS generation
      const accountNameMatch = connectionString.match(/AccountName=([^;]+)/);
      const accountKeyMatch = connectionString.match(/AccountKey=([^;]+)/);
      
      this.accountName = accountNameMatch ? accountNameMatch[1] : '';
      this.accountKey = accountKeyMatch ? accountKeyMatch[1] : '';
      
      this.blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
      this.containerClient = this.blobServiceClient.getContainerClient(containerName);
    } catch (error) {
      console.warn('Failed to initialize Azure Blob Storage:', error.message);
      this.blobServiceClient = null;
      this.containerClient = null;
      this.accountName = '';
      this.accountKey = '';
    }
  }

  async uploadFile(file: Express.Multer.File, fileName: string): Promise<string> {
    if (!this.blobServiceClient || !this.containerClient) {
      console.warn('Azure Blob Storage is not configured. Falling back to local storage or alternative solution.');
      throw new Error('Azure Blob Storage is not properly configured');
    }
    
    try {
      // Try to create container if it doesn't exist (without public access first)
      const containerExists = await this.containerClient.exists();
      if (!containerExists) {
        try {
          // Try creating with private access first
          await this.containerClient.create();
          console.log('Container created with private access');
        } catch (createError) {
          console.log('Failed to create private container, trying with blob access...');
          try {
            // If that fails, try with blob access (this might work on some accounts)
            await this.containerClient.create({ access: 'blob' });
            console.log('Container created with blob access');
          } catch (blobAccessError) {
            console.log('Failed to create container with blob access, using existing or default container');
          }
        }
      }

      const blockBlobClient = this.containerClient.getBlockBlobClient(fileName);
      
      // Upload file
      await blockBlobClient.uploadData(file.buffer, {
        blobHTTPHeaders: {
          blobContentType: file.mimetype,
        },
      });


      // Try to generate SAS URL first
      try {
        const sasUrl = await this.generateSasUrl(fileName);
        return sasUrl;
      } catch (sasError) {
        console.log('Failed to generate SAS URL, returning direct URL:', sasError.message);
        // Fallback to direct URL
        return blockBlobClient.url;
      }
    } catch (error) {
      console.error('Upload error details:', error);
      throw new Error(`Failed to upload file: ${error.message}`);
    }
  }

  private async generateSasUrl(fileName: string): Promise<string> {
    try {
      // Create shared key credential
      const sharedKeyCredential = new StorageSharedKeyCredential(this.accountName, this.accountKey);
      
      // Set SAS permissions and expiry (1 year from now)
      const sasOptions = {
        containerName: this.containerClient.containerName,
        blobName: fileName,
        permissions: BlobSASPermissions.parse('r'), // read permission
        expiresOn: new Date(new Date().valueOf() + 365 * 24 * 60 * 60 * 1000), // 1 year
      };

      // Generate SAS token
      const sasToken = generateBlobSASQueryParameters(sasOptions, sharedKeyCredential).toString();
      
      // Return full URL with SAS token
      const blockBlobClient = this.containerClient.getBlockBlobClient(fileName);
      return `${blockBlobClient.url}?${sasToken}`;
    } catch (error) {
      console.error('Failed to generate SAS URL:', error);
      // Fallback to direct URL (might not work with private storage)
      const blockBlobClient = this.containerClient.getBlockBlobClient(fileName);
      return blockBlobClient.url;
    }
  }

  async deleteFile(fileName: string): Promise<boolean> {
    try {
      const blockBlobClient = this.containerClient.getBlockBlobClient(fileName);
      await blockBlobClient.delete();
      return true;
    } catch (error) {
      console.error(`Failed to delete file: ${error.message}`);
      return false;
    }
  }

  async getFileUrl(fileName: string): Promise<string> {
    // Generate SAS URL for secure access
    return this.generateSasUrl(fileName);
  }

  generateFileName(originalName: string, prefix?: string): string {
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const extension = originalName.split('.').pop();
    const cleanName = originalName.replace(/[^a-zA-Z0-9.-]/g, '').substring(0, 50);
    
    return `${prefix || 'file'}-${timestamp}-${randomString}.${extension}`;
  }

  extractFileNameFromUrl(url: string): string {
    // Extract filename from Azure blob URL
    const urlParts = url.split('/');
    return urlParts[urlParts.length - 1];
  }
}
