import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);

  constructor(private readonly configService: ConfigService) {
    cloudinary.config({
      cloud_name: this.configService.get<string>('CLOUDINARY_CLOUD_NAME'),
      api_key: this.configService.get<string>('CLOUDINARY_API_KEY'),
      api_secret: this.configService.get<string>('CLOUDINARY_API_SECRET'),
    });
  }

  async uploadImage(filePath: string, folder: string = 'products'): Promise<string> {
    try {
      const result = await cloudinary.uploader.upload(filePath, {
        folder: `mini-e/${folder}`,
        resource_type: 'image',
        transformation: [
          { quality: 'auto' },
          { fetch_format: 'auto' },
        ],
      });

      this.logger.log(`Uploaded image to Cloudinary: ${result.secure_url}`);
      return result.secure_url;
    } catch (error) {
      this.logger.error(`Failed to upload image to Cloudinary: ${error.message}`, error.stack);
      throw error;
    }
  }

  async uploadImageFromBuffer(
    buffer: Buffer,
    filename: string,
    folder: string = 'products',
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: `mini-e/${folder}`,
          resource_type: 'image',
          public_id: filename.replace(/\.[^/.]+$/, ''),
          transformation: [
            { quality: 'auto' },
            { fetch_format: 'auto' },
          ],
        },
        (error, result) => {
          if (error) {
            this.logger.error(`Failed to upload image from buffer: ${error.message}`, error.stack);
            return reject(error);
          }
          this.logger.log(`Uploaded image to Cloudinary: ${result.secure_url}`);
          resolve(result.secure_url);
        },
      );

      const readable = new Readable();
      readable.push(buffer);
      readable.push(null);
      readable.pipe(uploadStream);
    });
  }

  async deleteImage(publicId: string): Promise<void> {
    try {
      await cloudinary.uploader.destroy(publicId);
      this.logger.log(`Deleted image from Cloudinary: ${publicId}`);
    } catch (error) {
      this.logger.error(`Failed to delete image from Cloudinary: ${error.message}`, error.stack);
      throw error;
    }
  }

  extractPublicId(url: string): string | null {
    try {
      const matches = url.match(/\/v\d+\/(.+?)(?:\.(jpg|jpeg|png|webp|gif))?$/i);
      return matches ? matches[1] : null;
    } catch {
      return null;
    }
  }
}

