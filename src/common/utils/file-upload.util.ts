import { diskStorage } from 'multer';
import { HttpException, HttpStatus } from '@nestjs/common';

// Optional: if you prefer memory storage (for buffer)
import * as multer from 'multer';
export const multerMemoryStorage = multer.memoryStorage();

// Or if you want disk storage:
export const multerDiskStorage = diskStorage({
  destination: './uploads',
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${file.fieldname}-${uniqueSuffix}`);
  },
});

export const fileFilter = (
  req: Express.Request,
  file: Express.Multer.File,
  cb: any,
) => {
  if (!file.mimetype.match(/\/(jpg|jpeg|png|gif)$/)) {
    return cb(
      new HttpException(
        'Only image files are allowed!',
        HttpStatus.BAD_REQUEST,
      ),
      false,
    );
  }
  cb(null, true);
};
