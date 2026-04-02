// src/utils/multer.options.ts
import { diskStorage } from 'multer';
import { HttpException, HttpStatus } from '@nestjs/common';

export const imageFileFilter = (
  req: Express.Request,
  file: Express.Multer.File,
  callback: Function,
) => {
  if (!file) {
    return callback(
      new HttpException('File is required', HttpStatus.BAD_REQUEST),
      false,
    );
  }

  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/jpg'];
  if (!allowedMimeTypes.includes(file.mimetype)) {
    return callback(
      new HttpException(
        'Only JPEG and PNG images are allowed',
        HttpStatus.BAD_REQUEST,
      ),
      false,
    );
  }

  // Note: file.size is NOT available in fileFilter (it's only available after upload)
  // So size validation must still happen later (e.g., in controller)
  callback(null, true);
};
