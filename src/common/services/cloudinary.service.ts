import { Injectable } from '@nestjs/common';
import { CloudinaryConfig } from '../../config/cloudinary.config';
import { UploadApiOptions, UploadApiResponse } from 'cloudinary';

@Injectable()
export class CloudinaryService {
  constructor(private readonly cloudinaryConfig: CloudinaryConfig) {}

  async uploadImage(
    file: Express.Multer.File,
    folder?: string,
  ): Promise<UploadApiResponse> {
    if (!file) {
      throw new Error('No file provided');
    }

    const uploadOptions: UploadApiOptions = {
      folder: folder || 'uploads',
      resource_type: 'auto',
    };

    return new Promise((resolve, reject) => {
      this.cloudinaryConfig
        .getCloudinary()
        .uploader.upload_stream(uploadOptions, (error, result) => {
          if (error) return reject(error);
          resolve(result as UploadApiResponse);
        })
        .end(file.buffer);
    });
  }
}
