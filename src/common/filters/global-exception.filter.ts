import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | object = 'Internal server error';
    let errorDetail: string | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      message = typeof res === 'string' ? res : (res as any).message || res;
    } else if (exception instanceof Error) {
      errorDetail = exception.message;
      message = exception.message || 'Internal server error';
      this.logger.error(
        `${request.method} ${request.url} failed: ${exception.message}`,
        exception.stack,
      );
    } else {
      message = String(exception);
      this.logger.error(
        `${request.method} ${request.url} failed with unknown error:`,
        String(exception),
      );
    }

    response.status(status).json({
      statusCode: status,
      success: false,
      message:
        typeof message === 'string'
          ? message
          : (message as any).message || message,
      ...(errorDetail && status === HttpStatus.INTERNAL_SERVER_ERROR
        ? { error: errorDetail }
        : {}),
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }
}
