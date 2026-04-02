// src/exception/multer-exception.filter.ts
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';

@Catch()
export class MulterExceptionFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();

    // Handle Multer file size error
    if (exception.code === 'LIMIT_FILE_SIZE') {
      return response.status(HttpStatus.BAD_REQUEST).json({
        statusCode: HttpStatus.BAD_REQUEST,
        success: false,
        message: 'File size must not exceed 5 MB.',
      });
    }

    // Handle other known Multer errors
    if (exception.field) {
      return response.status(HttpStatus.BAD_REQUEST).json({
        statusCode: HttpStatus.BAD_REQUEST,
        success: false,
        message: 'Invalid file upload.',
      });
    }

    // Fallback
    return response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      success: false,
      message: 'File upload failed.',
    });
  }
}
