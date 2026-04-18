import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { CloudinaryConfig } from '../../config/cloudinary.config';
import { UploadApiOptions, UploadApiResponse } from 'cloudinary';

@Injectable()
export class CloudinaryService {
  private readonly logger = new Logger(CloudinaryService.name);

  constructor(private readonly cloudinaryConfig: CloudinaryConfig) {}

  async uploadImage(
    file: Express.Multer.File,
    folder?: string,
  ): Promise<UploadApiResponse> {
    if (!file) {
      throw new BadRequestException('No image file provided');
    }

    const uploadOptions: UploadApiOptions = {
      folder: folder || 'uploads',
      resource_type: 'auto',
    };

    return new Promise((resolve, reject) => {
      this.cloudinaryConfig
        .getCloudinary()
        .uploader.upload_stream(uploadOptions, (error, result) => {
          if (error) {
            this.logger.error(
              `Cloudinary upload failed: ${error.message}`,
              error.stack,
            );
            return reject(
              new InternalServerErrorException(
                'Image upload failed. Check Cloudinary configuration and selected file.',
              ),
            );
          }

          if (!result?.secure_url) {
            this.logger.error('Cloudinary upload returned no secure_url');
            return reject(
              new InternalServerErrorException(
                'Image upload failed. Cloudinary did not return a URL.',
              ),
            );
          }

          resolve(result as UploadApiResponse);
        })
        .end(file.buffer);
    });
  }
}
