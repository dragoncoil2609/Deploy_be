import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';
import * as fs from 'fs';

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);

  constructor(private readonly configService: ConfigService) {
    const cloudName = this.configService.get<string>('CLOUDINARY_CLOUD_NAME');
    const apiKey = this.configService.get<string>('CLOUDINARY_API_KEY');
    const apiSecret = this.configService.get<string>('CLOUDINARY_API_SECRET');

    if (!cloudName || !apiKey || !apiSecret) {
      this.logger.error(
        'Cloudinary configuration missing. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET',
      );
      throw new Error('Cloudinary configuration is incomplete');
    }

    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
    });

    this.logger.log('Cloudinary configured successfully');
  }

  async uploadImage(filePath: string, folder: string = 'products'): Promise<string> {
    try {
      if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
      }

      const stats = fs.statSync(filePath);
      if (stats.size === 0) {
        throw new Error(`File is empty: ${filePath}`);
      }

      this.logger.log(`Uploading image to Cloudinary: ${filePath} (${stats.size} bytes)`);

      const result = await cloudinary.uploader.upload(filePath, {
        folder: `mini-e/${folder}`,
        resource_type: 'image',
        use_filename: false,
        unique_filename: true,
        overwrite: false,
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'gif'],
      });

      if (!result || !result.secure_url) {
        throw new Error('Cloudinary upload returned invalid result');
      }

      this.logger.log(`Successfully uploaded image to Cloudinary: ${result.secure_url}`);
      return result.secure_url;
    } catch (error: any) {
      const errorMessage = error?.message || 'Unknown error';
      const errorDetails = error?.http_code
        ? `HTTP ${error.http_code}: ${errorMessage}`
        : errorMessage;

      this.logger.error(
        `Failed to upload image to Cloudinary: ${errorDetails}`,
        error?.stack || error,
      );

      if (error?.http_code === 400) {
        throw new Error(
          `Cloudinary upload failed (400): ${errorMessage}. Please check your Cloudinary credentials and file format.`,
        );
      }

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

          // Sửa lỗi: Kiểm tra result có tồn tại không trước khi dùng
          if (!result) {
            const err = new Error('Cloudinary upload returned undefined result');
            this.logger.error(err.message);
            return reject(err);
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