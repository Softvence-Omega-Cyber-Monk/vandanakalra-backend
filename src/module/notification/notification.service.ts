import {
  HttpStatus,
  Injectable,
  OnModuleInit,
  HttpException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';

@Injectable()
export class NotificationService implements OnModuleInit {
  private readonly logger = new Logger(NotificationService.name);

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: this.configService.getOrThrow<string>(
            'FIREBASE_PROJECT_ID',
          ),
          clientEmail: this.configService.getOrThrow<string>(
            'FIREBASE_CLIENT_EMAIL',
          ),
          privateKey: this.configService
            .getOrThrow<string>('FIREBASE_PRIVATE_KEY')
            ?.replace(/\\n/g, '\n'),
        } as admin.ServiceAccount),
        projectId: this.configService.getOrThrow<string>('FIREBASE_PROJECT_ID'),
      });

      this.logger.log('Firebase initialized');
    } else {
      this.logger.log('Firebase already initialized');
    }
  }

  async sendPushNotification(
    fcmToken: string,
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<string> {
    if (!fcmToken) {
      throw new HttpException(
        'Invalid FCM token: Token is missing or too short',
        HttpStatus.BAD_REQUEST,
      );
    }

    try {
      const message = {
        notification: { title, body },
        data,
        token: fcmToken,
      };

      const response = await admin.messaging().send(message);
      console.log('✅ FCM notification sent:', response);
      return response;
    } catch (error) {
      console.error('❌ FCM send error:', error);

      // Handle Firebase-specific errors
      if (error?.code) {
        switch (error.code) {
          case 'messaging/invalid-registration-token':
          case 'messaging/registration-token-not-registered':
            throw new HttpException(
              'Device token is invalid or no longer registered. Please refresh the app.',
              HttpStatus.BAD_REQUEST,
            );

          case 'messaging/message-rate-exceeded':
            throw new HttpException(
              'Too many messages sent. Please try again later.',
              HttpStatus.TOO_MANY_REQUESTS,
            );

          case 'messaging/invalid-argument':
            throw new HttpException(
              'Invalid notification payload or token format.',
              HttpStatus.BAD_REQUEST,
            );

          case 'messaging/server-unavailable':
          case 'messaging/third-party-auth-error':
            throw new HttpException(
              'Notification service temporarily unavailable.',
              HttpStatus.SERVICE_UNAVAILABLE,
            );

          default:
            throw new HttpException(
              `Failed to send notification: ${error.message || 'Unknown error'}`,
              HttpStatus.INTERNAL_SERVER_ERROR,
            );
        }
      }

      // Fallback for non-Firebase errors
      throw new HttpException(
        'Failed to send push notification due to an internal error.',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // --- 🔥 NEW: Bulk notification (reusable) ---
  async sendBulkPushNotification(
    fcmTokens: string[],
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<{ successCount: number; failedTokens: string[] }> {
    // Filter out empty/invalid tokens
    const validTokens = fcmTokens
      .map((t) => t?.trim())
      .filter((t): t is string => !!t);

    if (validTokens.length === 0) {
      this.logger.warn('No valid FCM tokens provided for bulk notification');
      return { successCount: 0, failedTokens: [] };
    }

    try {
      const messages = validTokens.map((token) => ({
        token,
        notification: { title, body },
      }));

      const response = await admin.messaging().sendEach(messages);

      const failedTokens: string[] = [];
      response.responses.forEach((resp, index) => {
        if (!resp.success) {
          this.logger.warn(
            `FCM failed for token ${validTokens[index].substring(0, 10)}...: ${resp.error?.message || 'Unknown error'}`,
          );
          failedTokens.push(validTokens[index]);
        }
      });

      const successCount = validTokens.length - failedTokens.length;
      this.logger.log(
        `✅ Bulk notification: ${successCount}/${validTokens.length} sent`,
      );

      return { successCount, failedTokens };
    } catch (error) {
      this.logger.error('Bulk FCM send error:', error);
      throw new HttpException(
        'Failed to send bulk notifications',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // --- Shared error handler ---
  private handleFirebaseError(error: any): never {
    this.logger.error('FCM error:', error);

    if (error?.code) {
      switch (error.code) {
        case 'messaging/invalid-registration-token':
        case 'messaging/registration-token-not-registered':
          throw new HttpException(
            'Device token is invalid or no longer registered.',
            HttpStatus.BAD_REQUEST,
          );
        case 'messaging/message-rate-exceeded':
          throw new HttpException(
            'Too many messages sent. Please try again later.',
            HttpStatus.TOO_MANY_REQUESTS,
          );
        case 'messaging/invalid-argument':
          throw new HttpException(
            'Invalid notification payload or token format.',
            HttpStatus.BAD_REQUEST,
          );
        case 'messaging/server-unavailable':
        case 'messaging/third-party-auth-error':
          throw new HttpException(
            'Notification service temporarily unavailable.',
            HttpStatus.SERVICE_UNAVAILABLE,
          );
        default:
          throw new HttpException(
            `Failed to send notification: ${error.message || 'Unknown error'}`,
            HttpStatus.INTERNAL_SERVER_ERROR,
          );
      }
    }

    throw new HttpException(
      'Failed to send push notification due to an internal error.',
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}
