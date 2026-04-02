import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/module/prisma/prisma.service';
import { CreateEventDto } from './dto/create-event.dto';
import {
  ApproveOutsideEventDto,
  NotificationEventDto,
  UpdateAdminSettingsDto,
  UpdateEventDto,
  UpdateUserNotificationSettingsDto,
} from './dto/update-event.dto';
import { CreateOutsideEventDto } from './dto/create-outside.dto';
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class EventService {
  constructor(
    private prisma: PrismaService,
    private notification: NotificationService,
  ) {}

  async createEvent(createEventDto: CreateEventDto, userId?: string) {
    // 1. Create the event
    const event = await this.prisma.client.event.create({
      data: {
        title: createEventDto.title,
        description: createEventDto.description,
        pointValue: createEventDto.pointValue,
        date: new Date(createEventDto.date),
        time: createEventDto.time,
        maxStudent: createEventDto.maxStudent,
        eventType: createEventDto.eventType || 'INSIDE',
        userId: userId,
      },
    });

    // 2. Check if ANY active admin has adminCreateEventNotify enabled
    const adminWithNotifyEnabled = await this.prisma.client.user.findFirst({
      where: {
        role: 'ADMIN', // or userRole.ADMIN if it's an enum
        isActive: true,
        isDeleted: false,
        adminCreateEventNotify: true,
      },
    });

    // 3. Only send notifications if enabled by admin settings
    if (adminWithNotifyEnabled) {
      const users = await this.prisma.client.user.findMany({
        where: {
          isNewEventNotify: true,
          isActive: true,
          isDeleted: false,
          fcmToken: { not: null },
        },
        select: { fcmToken: true },
      });

      const fcmTokens = users
        .map((u) => u.fcmToken!)
        .filter((token): token is string => Boolean(token)); // TypeScript-safe filter

      if (fcmTokens.length > 0) {
        await this.notification.sendBulkPushNotification(
          fcmTokens,
          '🎉 New Event Created!',
          `A new event "${event.title}" is now available!`,
          { eventType: 'new_event', eventId: event.id },
        );
      }
    }

    return event; // 👈 don't forget to return the event!
  }

  async createOutsideEvent(dto: CreateOutsideEventDto, userId?: string) {
    // 1. Check if any active admin allows custom (outside) events
    const adminAllowingCustom = await this.prisma.client.user.findFirst({
      where: {
        role: 'ADMIN', // or userRole.ADMIN if using enum
        isActive: true,
        isDeleted: false,
        adminAllowCustomPoint: true,
      },
    });

    if (!adminAllowingCustom) {
      throw new ForbiddenException(
        'Outside event creation is currently disabled by the administrator.',
      );
    }

    // 2. Validate user if provided
    if (userId) {
      const user = await this.prisma.client.user.findUnique({
        where: { id: userId },
      });
      if (!user) {
        throw new NotFoundException('User not found');
      }
    }

    // 3. Parse and validate date
    let eventDate: Date | undefined = undefined;
    if (dto.date) {
      const parsed = new Date(dto.date);
      if (isNaN(parsed.getTime())) {
        throw new BadRequestException(
          'Invalid date. Use ISO 8601 format (e.g., "2026-01-10").',
        );
      }
      eventDate = parsed;
    }

    // 4. Create the outside event
    return this.prisma.client.outsideEvent.create({
      data: {
        title: dto.title,
        description: dto.description,
        date: eventDate,
        pointValue: dto.pointValue,
        userId: userId || undefined,
      },
    });
  }
  async getUnapprovedOutsideEvents() {
    return this.prisma.client.outsideEvent.findMany({
      where: {
        approved: false,
      },
      include: {
        user: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async approveOutsideEvent(dto: ApproveOutsideEventDto) {
    const { eventId, isActiveOrReject } = dto;

    // 1. Fetch the outside event with user (including fcmToken)
    const event = await this.prisma.client.outsideEvent.findUnique({
      where: { id: eventId },
      include: {
        user: {
          select: {
            id: true,
            firstname: true,
            lastname: true,
            fcmToken: true,
            point: true,
            isEventApproveNotify: true,
          },
        },
      },
    });

    if (!event) {
      throw new NotFoundException('Outside event not found');
    }

    if (event.approved) {
      throw new BadRequestException('Event is already approved');
    }

    if (!event.userId || !event.user) {
      throw new BadRequestException('Event is not associated with any user');
    }

    const { fcmToken, firstname, lastname, isEventApproveNotify } = event.user;

    if (isActiveOrReject === 'APPROVE') {
      // Perform approval: update event + add points
      const updatedEvent = await this.prisma.client.$transaction(async (tx) => {
        const updated = await tx.outsideEvent.update({
          where: { id: eventId },
          data: { approved: true },
        });

        await tx.user.update({
          where: { id: event.userId! },
          data: {
            point: { increment: event.pointValue },
          },
        });

        return updated;
      });

      // Send approval notification
      if (fcmToken && isEventApproveNotify) {
        await this.notification.sendPushNotification(
          fcmToken,
          'Points Awarded! 🎉',
          `Your outside event "${event.title}" has been approved. ${event.pointValue} points added!`,
          { status: 'approved', eventId: event.id },
        );
      }

      return updatedEvent;
    } else if (isActiveOrReject === 'REJECT') {
      // Reject: delete the outside event
      await this.prisma.client.outsideEvent.delete({
        where: { id: eventId },
      });

      // Optional: Send rejection notification
      if (fcmToken && isEventApproveNotify) {
        await this.notification.sendPushNotification(
          fcmToken,
          'Event Rejected ❌',
          `Your outside event "${event.title}" was not approved and has been removed.`,
          { status: 'rejected', eventId: event.id },
        );
      }

      return { success: true, message: 'Event rejected and deleted' };
    }

    throw new BadRequestException('Invalid isActiveOrReject value');
  }

  async getUserApprovedOutsideEventsWithSummary(userId: string) {
    // 1. Fetch all approved outside events for the user
    const approvedEvents = await this.prisma.client.outsideEvent.findMany({
      where: {
        userId,
        approved: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // 2. Calculate total count and total points
    const totalCount = approvedEvents.length;
    const totalPoints = approvedEvents.reduce(
      (sum, event) => sum + event.pointValue,
      0,
    );

    return {
      events: approvedEvents,
      totalCount,
      totalPoints,
    };
  }

  async deleteUnapprovedOutsideEvent(eventId: string) {
    // Find the event with approval status
    const event = await this.prisma.client.outsideEvent.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundException('Outside event not found');
    }

    if (event.approved) {
      throw new BadRequestException('Cannot delete an approved event');
    }

    // Delete the unapproved event
    await this.prisma.client.outsideEvent.delete({
      where: { id: eventId },
    });

    return {
      message: 'Unapproved outside event deleted successfully',
    };
  }

  async updateEvent(eventId: string, updateEventDto: UpdateEventDto) {
    // Check if event exists
    const event = await this.prisma.client.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    // Prepare update data
    const updateData: any = {};

    if (updateEventDto.title !== undefined)
      updateData.title = updateEventDto.title;
    if (updateEventDto.description !== undefined)
      updateData.description = updateEventDto.description;
    if (updateEventDto.pointValue !== undefined)
      updateData.pointValue = updateEventDto.pointValue;
    if (updateEventDto.date !== undefined)
      updateData.date = new Date(updateEventDto.date);
    if (updateEventDto.time !== undefined)
      updateData.time = updateEventDto.time;
    if (updateEventDto.maxStudent !== undefined)
      updateData.maxStudent = updateEventDto.maxStudent;
    if (updateEventDto.eventType !== undefined)
      updateData.eventType = updateEventDto.eventType;

    // Update event
    const updatedEvent = await this.prisma.client.event.update({
      where: { id: eventId },
      data: updateData,
    });

    return updatedEvent;
  }

  async NotificationEventUpdate(userId: string, dto: NotificationEventDto) {
    // Optional: verify user exists
    const user = await this.prisma.client.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Build update payload dynamically — only include fields that are defined
    const updateData: {
      isEventApproveNotify?: boolean;
      isNewEventNotify?: boolean;
      isEventReminder?: boolean;
    } = {};

    if (dto.isEventApproveNotify !== undefined) {
      updateData.isEventApproveNotify = dto.isEventApproveNotify;
    }
    if (dto.isNewEventNotify !== undefined) {
      updateData.isNewEventNotify = dto.isNewEventNotify;
    }
    if (dto.isEventReminder !== undefined) {
      updateData.isEventReminder = dto.isEventReminder;
    }

    // Only proceed if at least one field is provided
    if (Object.keys(updateData).length === 0) {
      throw new BadRequestException('No valid fields to update');
    }

    const updatedUser = await this.prisma.client.user.update({
      where: { id: userId },
      data: updateData,
    });

    return updatedUser;
  }
  async getEventById(eventId: string) {
    const event = await this.prisma.client.event.findUnique({
      where: { id: eventId },
      include: {
        enrolled: true,
      },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    return event;
  }

  async getAllEvents() {
    const events = await this.prisma.client.event.findMany({
      include: {
        enrolled: true,
      },
    });

    return events;
  }

  async getUpcomingEvents(userId: string) {
    const now = new Date();
    // Set to start of the day (00:00:00.000) in local time
    const startOfToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );
    const upcomingEvents = await this.prisma.client.event.findMany({
      where: {
        date: {
          gte: startOfToday,
        },
      },
      select: {
        id: true,
        date: true,
        time: true,
        // Add other event fields you need here (name, location, etc.)
        title: true, // example
        pointValue: true,
        eventType: true,
        maxStudent: true,
        description: true,
        createdAt: true,
        studentEnrolled: true,
        enrolled: {
          where: {
            userId: userId, // assuming your field is `userId` (check casing!)
          },
          select: {
            userId: true,
          },
        },
      },
      orderBy: {
        date: 'asc',
      },
    });

    // Map to add `enrolled: boolean`
    const eventsWithEnrollmentStatus = upcomingEvents.map((event) => ({
      ...event,
      enrolled: event.enrolled.length > 0, // true if user is enrolled, false otherwise
    }));
    return eventsWithEnrollmentStatus;
  }

  async getAttendedEventsWithStats(userId: string) {  
    const user = await this.prisma.client.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const attendedEnrollments = await this.prisma.client.enrolled.findMany({
      where: {
        userId,
        status: 'ATTENDED',
      },
      include: {
        event: true,
      },
    });

    const totalAttended = attendedEnrollments.length;

    // Event points
    const eventPoints = attendedEnrollments.reduce(
      (sum, enrollment) => sum + (enrollment.event?.pointValue || 0),
      0,
    );

    // Attendance points (1 point per attendance)
    const attendanceCount = await this.prisma.client.attendence.count({
      where: {
        userId,
        attendence: 'PRESENT',
      },
    });

    // Final total (merged)
    const totalPoints = eventPoints + attendanceCount;

    return {
      attendedEvents: attendedEnrollments,
      totalAttended,
      totalPoints,
    };
  }

  async getJoinEventsWithStats(userId: string) {
    // Check if user exists
    const user = await this.prisma.client.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Fetch attended enrollments with event data
    const joinEnrollments = await this.prisma.client.enrolled.findMany({
      where: {
        userId,
        status: {
          in: ['JOIN', 'SCANNED'],
        },
      },
      include: {
        event: true,
      },
    });

    const totalJoin = joinEnrollments.length;

    return {
      attendedEvents: joinEnrollments,
      totalJoin,
    };
  }
  // issues
  async getScannedEventByUser(userId: string) {
    // Check if user exists
    const user = await this.prisma.client.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Fetch attended enrollments with event data
    const scanedEnrollments = await this.prisma.client.enrolled.findMany({
      where: {
        userId,
        status: 'SCANNED',
      },
      include: {
        event: true,
      },
    });

    const totalScanned = scanedEnrollments.length;

    return {
      scanedEvents: scanedEnrollments,
      totalScanned,
    };
  }
  async deleteEvent(eventId: string, userId?: string) {
    const event = await this.prisma.client.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    const deletedEvent = await this.prisma.client.event.delete({
      where: { id: eventId },
    });

    return deletedEvent;
  }

  // user.service.ts (or setting.service.ts)

  async getAdminSettings(userId: string) {
    // Find any active, non-deleted admin (settings are global, so one is enough)
    const admin = await this.prisma.client.user.findFirst({
      where: {
        id: userId,
      },
      select: {
        adminAutoApprovePoint: true,
        adminAllowCustomPoint: true,
        adminCreateEventNotify: true,
        adminEventReminders: true,
      },
    });

    // Fallback to defaults if no admin exists (optional but safe)
    return {
      adminAutoApprovePoint: admin?.adminAutoApprovePoint ?? true,
      adminAllowCustomPoint: admin?.adminAllowCustomPoint ?? true,
      adminCreateEventNotify: admin?.adminCreateEventNotify ?? true,
      adminEventReminders: admin?.adminEventReminders ?? true,
    };
  }

  async getUserNotificationSettings(userId: string) {
    const user = await this.prisma.client.user.findUnique({
      where: { id: userId },
      select: {
        isEventApproveNotify: true,
        isNewEventNotify: true,
        isEventReminder: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async updateAdminSettings(dto: UpdateAdminSettingsDto, userId: string) {
    // Find an active, non-deleted admin to update
    const admin = await this.prisma.client.user.findFirst({
      where: {
        id: userId,
      },
      select: { id: true },
    });

    if (!admin) {
      throw new NotFoundException('No active admin found to update settings');
    }

    // Build update payload: only include fields that are defined
    const updateData: {
      adminAutoApprovePoint?: boolean;
      adminAllowCustomPoint?: boolean;
      adminCreateEventNotify?: boolean;
      adminEventReminders?: boolean;
    } = {};

    if (dto.adminAutoApprovePoint !== undefined) {
      updateData.adminAutoApprovePoint = dto.adminAutoApprovePoint;
    }
    if (dto.adminAllowCustomPoint !== undefined) {
      updateData.adminAllowCustomPoint = dto.adminAllowCustomPoint;
    }
    if (dto.adminCreateEventNotify !== undefined) {
      updateData.adminCreateEventNotify = dto.adminCreateEventNotify;
    }
    if (dto.adminEventReminders !== undefined) {
      updateData.adminEventReminders = dto.adminEventReminders;
    }

    if (Object.keys(updateData).length === 0) {
      throw new BadRequestException('No valid fields provided for update');
    }

    // Update the admin user
    await this.prisma.client.user.update({
      where: { id: admin.id },
      data: updateData,
    });

    // Return the updated values (for confirmation)
    const updatedAdmin = await this.prisma.client.user.findUnique({
      where: { id: admin.id },
      select: {
        adminAutoApprovePoint: true,
        adminAllowCustomPoint: true,
        adminCreateEventNotify: true,
        adminEventReminders: true,
      },
    });

    return updatedAdmin as UpdateAdminSettingsDto;
  }
}
