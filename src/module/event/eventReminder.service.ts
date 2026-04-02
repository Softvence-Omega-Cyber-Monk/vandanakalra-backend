// event-reminder.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service'; // adjust path
import { NotificationService } from '../notification/notification.service'; // adjust path

@Injectable()
export class EventReminderService {
  private readonly logger = new Logger(EventReminderService.name);

  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationService,
  ) {}

  // 🔔 Run every hour (you can adjust frequency)
  @Cron(CronExpression.EVERY_HOUR)
  async sendEventReminders() {
    this.logger.log('🔍 Checking for upcoming events to remind...');

    const now = new Date();
    // Target: events starting between 23h and 25h from now (24h ±1h tolerance)
    const startWindow = new Date(now.getTime() + 23 * 60 * 60 * 1000); // +23h
    const endWindow = new Date(now.getTime() + 25 * 60 * 60 * 1000); // +25h

    // Find events in the 24h±1h window
    const upcomingEvents = await this.prisma.client.event.findMany({
      where: {
        date: {
          gte: startWindow,
          lte: endWindow,
        },
        enrolled: {
          some: {}, // Only events with at least one enrollment
        },
      },
      include: {
        enrolled: {
          include: {
            user: {
              select: {
                fcmToken: true,
                isEventReminder: true,
                isActive: true,
                isDeleted: true,
              },
            },
          },
        },
      },
    });

    if (upcomingEvents.length === 0) {
      this.logger.log('📭 No upcoming events in reminder window.');
      return;
    }

    this.logger.log(
      `📬 Found ${upcomingEvents.length} event(s) for reminders.`,
    );

    for (const event of upcomingEvents) {
      if (!event.time) continue;
      const eventDateTime = new Date(event.date);
      eventDateTime.setHours(
        parseInt(event.time.split(':')[0], 10),
        parseInt(event.time.split(':')[1], 10),
        0,
        0,
      );

      // Final check: is event really ~24h away?
      const diffMs = eventDateTime.getTime() - now.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);
      if (diffHours < 23 || diffHours > 25) continue;

      // Collect valid FCM tokens from enrolled users
      const fcmTokens = event.enrolled
        .map((enroll) => enroll.user)
        .filter(
          (user) =>
            user.isEventReminder &&
            user.isActive &&
            !user.isDeleted &&
            user.fcmToken,
        )
        .map((user) => user.fcmToken!) // safe due to filter
        .filter((token): token is string => !!token.trim());

      if (fcmTokens.length === 0) continue;

      // Send bulk notification
      const { successCount, failedTokens } =
        await this.notificationService.sendBulkPushNotification(
          fcmTokens,
          '⏰ Event Reminder',
          `Your event "${event.title}" starts tomorrow at ${event.time}! Don’t miss it.`,
          {
            eventType: 'event_reminder',
            eventId: event.id,
          },
        );

      // Optional: clean up failed tokens
      if (failedTokens.length > 0) {
        await this.prisma.client.user.updateMany({
          where: { fcmToken: { in: failedTokens } },
          data: { fcmToken: null },
        });
        this.logger.log(`🧹 Cleaned ${failedTokens.length} invalid FCM tokens`);
      }
    }
  }
}
