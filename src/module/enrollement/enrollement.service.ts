// enrollment.service.ts
import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/module/prisma/prisma.service';
import { Enrolled, Status } from '@prisma';
import { ClaimPointsDto, UpdateEnrollmentStatusDto } from './dto';
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class EnrollementService {
  constructor(
    private prisma: PrismaService,
    private notification: NotificationService,
  ) {}

  // Create enrollment (user self-enrolls)
  async createEnrollment(userId: string, eventId: string) {
    return this.prisma.client.$transaction(async (tx) => {
      const event = await tx.event.findUnique({
        where: { id: eventId },
      });

      if (!event) {
        throw new BadRequestException('Event not found');
      }

      // Optional: check if event is full
      if (event.studentEnrolled >= event.maxStudent) {
        throw new BadRequestException('Event has reached maximum capacity');
      }

      // Check if already enrolled
      const existing = await tx.enrolled.findUnique({
        where: { userId_eventId: { userId, eventId } },
      });

      if (existing) {
        throw new BadRequestException('Already enrolled in this event');
      }

      // Create enrollment
      const enrollment = await tx.enrolled.create({
        data: {
          userId,
          eventId,
          status: Status.JOIN,
        },
        include: { event: true },
      });

      // Increment studentEnrolled
      await tx.event.update({
        where: { id: eventId },
        data: {
          studentEnrolled: { increment: 1 },
        },
      });

      return enrollment;
    });
  }

  async claimPoints(dto: ClaimPointsDto, userId: string) {
    const { enrolledIds } = dto;

    // 1. Fetch enrollments
    const enrollments = await this.prisma.client.enrolled.findMany({
      where: {
        id: { in: enrolledIds },
        userId: userId,
      },
      include: {
        event: { select: { pointValue: true } },
        user: {
          select: {
            fcmToken: true,
            isEventApproveNotify: true,
          },
        },
      },
    });

    // 2. Validate existence
    const foundIds = new Set(enrollments.map((e) => e.id));
    const missingIds = enrolledIds.filter((id) => !foundIds.has(id));
    if (missingIds.length > 0) {
      throw new NotFoundException(
        `Enrollment(s) not found: ${missingIds.join(', ')}`,
      );
    }

    // 3. Validate enrollment state
    for (const e of enrollments) {
      if (e.status !== 'SCANNED') {
        throw new BadRequestException(
          `Enrollment ${e.id} must have status 'SCANNED' to claim points`,
        );
      }
      if (e.claimPoint) {
        throw new BadRequestException(
          `Points already claimed  for enrollment ${e.id}`,
        );
      }
    }

    // 4. Claim immediately: mark attended + add points
    const updatedEnrollments = await this.prisma.client.$transaction(
      async (tx) => {
        const results: Enrolled[] = [];
        for (const e of enrollments) {
          const updated = await tx.enrolled.update({
            where: { id: e.id },
            data: {
              status: Status.ATTENDED,
              claimPoint: true,
            },
          });

          await tx.user.update({
            where: { id: userId },
            data: { point: { increment: e.event.pointValue } },
          });

          if (e.user.fcmToken && e.user.isEventApproveNotify) {
            await this.notification.sendPushNotification(
              e.user.fcmToken,
              'Points Added',
              'Your claimed point has been added to your events points.',
            );
          }

          results.push(updated);
        }
        return results;
      },
    );

    return {
      updatedEnrollments,
      message: `Points successfully claimed! You’ve earned Points`,
    };
  }
  async getAllClaimedWithJoinStatus() {
    const records = await this.prisma.client.enrolled.findMany({
      where: {
        claimPoint: true,
        status: 'SCANNED',
      },
      include: {
        event: true,
        user: true, // include related event
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return records;
  }

  // Admin-only: update enrollment status (e.g., ATTENDED)
  async updateEnrollmentStatus(
    enrollmentId: string,
    status: UpdateEnrollmentStatusDto,
  ) {
    // 1. Fetch enrollment with event and user
    const enrollment = await this.prisma.client.enrolled.findUnique({
      where: { id: enrollmentId },
      include: { event: true, user: true },
    });

    if (!enrollment) {
      throw new BadRequestException('Enrollment not found');
    }

    // 2. Prevent redundant ATTENDED update
    if (enrollment.status === 'ATTENDED' && status.status === 'ATTENDED') {
      throw new BadRequestException('User is already marked as ATTENDED');
    }

    // 4. Transaction: update enrollment + award points (only if ATTENDED)
    const updated = await this.prisma.client.$transaction(async (tx) => {
      const updatedEnrollment = await tx.enrolled.update({
        where: { id: enrollmentId },
        data: { status: status.status },
      });

      if (status.status === 'ATTENDED') {
        await tx.user.update({
          where: { id: enrollment.userId },
          data: { point: { increment: enrollment.event.pointValue } },
        });
      }

      return updatedEnrollment;
    });

    // 5. Send push notification based on status
    const fcmToken = enrollment.user.fcmToken;
    const shouldNotify = enrollment.user.isEventApproveNotify; // Reusing this flag for both approve/reject

    if (fcmToken && shouldNotify) {
      if (status.status === 'ATTENDED') {
        await this.notification.sendPushNotification(
          fcmToken,
          'Claim Approved!',
          'Your claimed point has been approved.',
          { status: 'approved' },
        );
      } else if (status.status === 'REJECTED') {
        await this.notification.sendPushNotification(
          fcmToken,
          'Claim Rejected',
          'Your claimed point has been rejected.',
          { status: 'rejected' },
        );
      }
      // Note: 'JOIN' typically doesn't need a notification — adjust if needed
    }

    return updated;
  }

  async updateEnrollmentStatusToScanned(
    enrollmentId: string,
    status: UpdateEnrollmentStatusDto,
  ) {
    // 1. Fetch enrollment with event and user
    const enrollment = await this.prisma.client.enrolled.findUnique({
      where: { id: enrollmentId },
      include: { event: true, user: true },
    });

    if (!enrollment) {
      throw new BadRequestException('Enrollment not found');
    }

    // 2. Prevent redundant ATTENDED update
    if (enrollment.status === 'SCANNED' && status.status === 'SCANNED') {
      throw new BadRequestException('User is already marked as SCANNED');
    }

    // 4. Transaction: update enrollment + award points (only if ATTENDED)
    const updated = await this.prisma.client.$transaction(async (tx) => {
      const updatedEnrollment = await tx.enrolled.update({
        where: { id: enrollmentId },
        data: { status: status.status },
      });

      return updatedEnrollment;
    });

    // 5. Send push notification based on status
    const fcmToken = enrollment.user.fcmToken;
    const shouldNotify = enrollment.user.isEventApproveNotify; // Reusing this flag for both approve/reject

    if (fcmToken && shouldNotify) {
      if (status.status === 'ATTENDED') {
        await this.notification.sendPushNotification(
          fcmToken,
          'Claim Approved!',
          'Your claimed point has been approved.',
          { status: 'approved' },
        );
      } else if (status.status === 'REJECTED') {
        await this.notification.sendPushNotification(
          fcmToken,
          'Claim Rejected',
          'Your claimed point has been rejected.',
          { status: 'rejected' },
        );
      }
      // Note: 'JOIN' typically doesn't need a notification — adjust if needed
    }

    return updated;
  }

  // Get all JOIN enrollments for a specific user
  async getUserEnrollmentsWithJoinStatus(userId: string) {
    return this.prisma.client.enrolled.findMany({
      where: {
        userId,
        status: Status.JOIN,
      },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            date: true,
            time: true,
            pointValue: true,
            eventType: true,
          },
        },
      },
    });
  }

  // Optional: Manual claim point (if needed later)
  // Not used in current flow, since auto-claimed on ATTENDED
}
