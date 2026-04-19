import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from 'src/module/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
// import { RegisterDto } from './dto/register.dto';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dto/login.dto';
import { getTokens } from './auth.utils';
import { MailerService } from '@nestjs-modules/mailer';
// import { SystemRole } from '@prisma';
import { RegisterDto } from './dto/register.dto';
// import { userRole } from '@prisma';
import {
  AccountActiveDto,
  ChangePasswordDto,
  UpdateUserProfileDto,
} from './dto/update-account.dto';
import { NotificationService } from '../notification/notification.service';
import { CreateAttendanceDto } from './dto/attendence.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private mailerService: MailerService,
    private notification: NotificationService,
  ) {}

  async register(dto: RegisterDto) {
    const existingUser = await this.prisma.client.user.findUnique({
      where: { username: dto.username },
    });

    if (existingUser) {
      throw new BadRequestException('Username is already registered!');
    }

    const hashedPassword = await bcrypt.hash(
      dto.password,
      parseInt(process.env.SALT_ROUND!, 10),
    );

    const newUser = await this.prisma.client.user.create({
      data: {
        firstname: dto.firstName,
        lastname: dto.lastName,
        username: dto.username,
        password: hashedPassword,
        fcmToken: dto.fcmToken,
      },
    });

    // 🔔 Notify all active admins about new registration
    const adminUsers = await this.prisma.client.user.findMany({
      where: {
        role: 'ADMIN', // or userRole.ADMIN if using enum
        isActive: true,
        isDeleted: false,
        fcmToken: { not: null },
      },
      select: { fcmToken: true },
    });

    const adminFcmTokens = adminUsers
      .map((admin) => admin.fcmToken!)
      .filter((token): token is string => Boolean(token));

    if (adminFcmTokens.length > 0) {
      await this.notification.sendBulkPushNotification(
        adminFcmTokens,
        '🆕 New User Registration',
        `A new user "${newUser.firstname} ${newUser.lastname}" has registered.`,
        { eventType: 'new_user_registration', userId: newUser.id },
      );
    }

    const tokens = await getTokens(
      this.jwtService,
      newUser.id,
      newUser.username,
      newUser.role,
      newUser.firstname,
      newUser.lastname,
    );

    return { user: newUser, ...tokens };
  }

  async createAdmin(dto: RegisterDto) {
    const existingUser = await this.prisma.client.user.findUnique({
      where: { username: dto.username },
    });

    if (existingUser) {
      throw new BadRequestException('Username is already registered!');
    }

    const hashedPassword = await bcrypt.hash(
      dto.password,
      parseInt(process.env.SALT_ROUND!, 10),
    );

    const newUser = await this.prisma.client.user.create({
      data: {
        firstname: dto.firstName,
        lastname: dto.lastName,
        username: dto.username,
        password: hashedPassword,
        fcmToken: dto.fcmToken,
        role: 'ADMIN',
        isActive: true,
      },
    });

    return { user: newUser };
  }

  // login
  async login(dto: LoginDto) {
    const user = await this.prisma.client.user.findUnique({
      where: { username: dto.username },
    });

    if (!user || !dto.password || !dto.fcmToken || !dto.role) {
      throw new ForbiddenException('Invalid credentials');
    }

    if (user.role !== dto.role) {
      throw new ForbiddenException(`${dto.role} role is not allowed here `);
    }

    if (user.isDeleted) {
      throw new BadRequestException('User is deleted!');
    }

    const isMatch = await bcrypt.compare(dto.password, user.password);
    if (!isMatch) {
      throw new ForbiddenException('Invalid credentials');
    }

    const updateToken = await this.prisma.client.user.update({
      where: { username: dto.username },
      data: { fcmToken: dto.fcmToken },
    });
    const tokens = await getTokens(
      this.jwtService,
      user.id,
      user.username,
      user.role,
      user.firstname,
      user.lastname,
    );

    return { user, ...tokens };
  }

  async active_account(dto: AccountActiveDto) {
    const user = await this.prisma.client.user.findUnique({
      where: { id: dto.userId },
    });

    if (!user) {
      throw new ForbiddenException('User not found');
    }

    // Handle rejection case
    if (dto.isActiveOrReject === 'REJECT') {
      // If user is already deleted, no need to update
      if (user.isDeleted) {
        return { updateUser: { ...user, isDeleted: true } };
      }

      const updateUser = await this.prisma.client.user.update({
        where: { id: dto.userId },
        data: {
          isDeleted: true,
          isActive: false, // Explicitly set to false for clarity
        },
        select: {
          id: true,
          isActive: true,
          isDeleted: true,
          fcmToken: true,
        },
      });

      // Send rejection notification
      if (updateUser.fcmToken) {
        await this.notification.sendPushNotification(
          updateUser.fcmToken,
          'Registration Rejected',
          'Your account registration has been rejected by the admin.',
          { status: 'rejected' },
        );
      }

      return { updateUser };
    }

    // Handle approval case (APPROVE)
    if (user.isActive) {
      // Already approved - just return current state
      return { updateUser: user };
    }

    if (user.isDeleted) {
      throw new BadRequestException('Cannot approve a deleted user!');
    }

    const updateUser = await this.prisma.client.user.update({
      where: { id: dto.userId },
      data: {
        isActive: true,
        isDeleted: false, // Ensure deleted status is cleared
      },
      select: {
        id: true,
        isActive: true,
        isDeleted: true,
        fcmToken: true,
      },
    });

    // Send approval notification
    if (updateUser.fcmToken) {
      await this.notification.sendPushNotification(
        updateUser.fcmToken,
        'Registration Approved!',
        'Your account has been approved by admin. You can now log in.',
        { status: 'approved' },
      );
    }

    return { updateUser };
  }

  // change password
  async changePassword(id: string, dto: ChangePasswordDto) {
    const user = await this.prisma.client.user.findUnique({ where: { id } });
    if (!user || !user.password) {
      throw new NotFoundException('User not found');
    }
    if (user.isDeleted) {
      throw new BadRequestException('The account is deleted!');
    }
    const isMatch = await bcrypt.compare(dto.oldPassword, user.password);
    if (!isMatch) {
      throw new BadRequestException('Old password is incorrect');
    }

    const hashed = await bcrypt.hash(
      dto.newPassword,
      parseInt(process.env.SALT_ROUND!),
    );
    await this.prisma.client.user.update({
      where: { id },
      data: { password: hashed },
    });

    return { message: 'Password changed successfully' };
  }
  // refresh token
  async refreshTokens(token: string) {
    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: process.env.REFRESH_TOKEN_SECRET,
      });

      const user = await this.prisma.client.user.findUnique({
        where: { username: payload.username },
      });
      if (!user) throw new UnauthorizedException('Invalid refresh token');
      // if(!user.isDeleted){
      //  throw new BadRequestException('User is blocked!');
      // }
      return getTokens(
        this.jwtService,
        user.id,
        user.username,
        user.role,
        user.firstname,
        user.lastname,
      );
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  //update profile
  async updateProfile(
    userId: string,
    dto: UpdateUserProfileDto,
    imageUrl?: string | null,
  ) {
    // Optional: Validate that user exists
    const existingUser = await this.prisma.client.user.findUnique({
      where: { id: userId },
    });

    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    // Update only provided fields
    const updatedUser = await this.prisma.client.user.update({
      where: { id: userId },
      data: {
        ...(dto.firstname !== undefined && { firstname: dto.firstname }),
        ...(dto.lastname !== undefined && { lastname: dto.lastname }),
        ...(imageUrl !== null && { image: imageUrl }),
        updatedAt: new Date(), // Optional: Prisma @updatedAt handles this automaticall
      },
    });

    // Omit sensitive fields like password
    const { password, ...safeUser } = updatedUser;
    return safeUser;
  }

  async createAttendance(userId: string) {
    // 1. Validate user exists
    const user = await this.prisma.client.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // 2. Define today's date range in UTC (or use your app's timezone consistently)
    const today = new Date();
    const now = new Date();
    const startOfPeriod = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        1, // 12:00 PM UTC
        0,
        0,
        0,
      ),
    );
    const endOfPeriod = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        23, // 1:00 PM UTC
        0,
        0,
        0,
      ),
    );

    // 3. Check if attendance already exists for this user today
    const existingAttendance = await this.prisma.client.attendence.findFirst({
      where: {
        userId,
        createdAt: {
          gte: startOfPeriod,
          lte: endOfPeriod,
        },
      },
    });

    if (existingAttendance) {
      throw new BadRequestException('Attendance already recorded for today');
    }

    // 4. Create new attendance
    const attendance = await this.prisma.client.attendence.create({
      data: {
        userId,
      },
    });

    return attendance;
  }

  async getAttendanceByDate(date: string) {
    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      throw new BadRequestException('Invalid date format. Use YYYY-MM-DD.');
    }

    // Normalize to start/end of day (UTC or local — adjust if needed)
    const startOfDay = new Date(parsedDate);
    startOfDay.setUTCHours(0, 0, 0, 0);

    const endOfDay = new Date(parsedDate);
    endOfDay.setUTCHours(23, 59, 59, 999);

    const attendances = await this.prisma.client.attendence.findMany({
      where: {
        createdAt: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            firstname: true,
            lastname: true,
            username: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    return attendances;
  }

  async forgotPassword(username: string, fcmToken: string) {
    const user = await this.prisma.client.user.findUnique({
      where: { username },
    });

    // Still avoid user enumeration → silently succeed if not found
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Generate 4-digit numeric token
    const resetToken = Math.floor(1000 + Math.random() * 9000).toString(); // e.g. "4829"
    const resetExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    const userUpdate = await this.prisma.client.user.update({
      where: { id: user.id },
      data: {
        resetPasswordToken: resetToken,
        resetPasswordExpires: resetExpires,
      },
    });

    // Send FCM with 4-digit code (user can type it, or app deep-links it)
    const response = await this.notification.sendPushNotification(
      fcmToken,
      'Password Reset Code',
      `Your code: ${resetToken}. Valid for 10 minutes`,
      { status: 'success' },
    );

    return resetToken;
  }

  async resetPassword(token: string, newPassword: string) {
    const user = await this.prisma.client.user.findFirst({
      where: {
        resetPasswordToken: token,
        resetPasswordExpires: {
          gte: new Date(), // greater than or equal to now → not expired
        },
      },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const updateUser = await this.prisma.client.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetPasswordToken: null,
        resetPasswordExpires: null,
      },
    });

    return updateUser;
  }

  async getUserProfile(userId: string) {
    const user = await this.prisma.client.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.isDeleted) {
      throw new NotFoundException('User not found');
    }

    const pointSummary = await this.getUserPointSummary(userId);

    return { user, ...pointSummary };
  }

  private async getUserPointSummary(userId: string) {
    const [attendedEnrollments, approvedOutsideEvents, attendencePoint] =
      await Promise.all([
        this.prisma.client.enrolled.findMany({
          where: {
            userId,
            status: 'ATTENDED',
          },
          select: {
            event: {
              select: {
                pointValue: true,
                eventType: true,
              },
            },
          },
        }),
        this.prisma.client.outsideEvent.findMany({
          where: {
            userId,
            approved: true,
          },
          select: {
            pointValue: true,
            eventType: true,
          },
        }),
        this.prisma.client.attendence.count({
          where: {
            userId,
            attendence: 'PRESENT',
          },
        }),
      ]);

    const attendedEventPoint = attendedEnrollments.reduce((sum, enrollment) => {
      const pointValue = enrollment.event?.pointValue || 0;
      return enrollment.event?.eventType === 'tutorpoint'
        ? sum
        : sum + pointValue;
    }, 0);

    const attendedTutorPoint = attendedEnrollments.reduce((sum, enrollment) => {
      const pointValue = enrollment.event?.pointValue || 0;
      return enrollment.event?.eventType === 'tutorpoint'
        ? sum + pointValue
        : sum;
    }, 0);

    const outsideEventPoint = approvedOutsideEvents.reduce((sum, event) => {
      return event.eventType === 'eventpoint' ? sum + event.pointValue : sum;
    }, 0);

    const outsideTutorPoint = approvedOutsideEvents.reduce((sum, event) => {
      return event.eventType === 'tutorpoint' ? sum + event.pointValue : sum;
    }, 0);

    const eventPoint = attendedEventPoint + outsideEventPoint;
    const tutorPoint = attendedTutorPoint + outsideTutorPoint;
    const totalPoint = eventPoint + tutorPoint + attendencePoint;

    return {
      totalPoint,
      eventPoint,
      tutorPoint,
      attendencePoint,
    };
  }

  async getUsers() {
    const user = await this.prisma.client.user.findMany({
      where: { isDeleted: false },
      orderBy: {
        point: 'desc', // 👈 descending order (highest to lowest)
      },
    });

    return { user };
  }

  async getNotActiveteUser() {
    const user = await this.prisma.client.user.findMany({
      where: { isDeleted: false, isActive: false },
      orderBy: {
        createdAt: 'desc', // 👈 descending order (highest to lowest)
      },
    });

    return { user };
  }

  async getTopFiveUserByPoint() {
    const users = await this.prisma.client.user.findMany({
      where: { isDeleted: false },
      orderBy: {
        point: 'desc',
      },
      take: 5, // 👈 limits result to top 5
    });

    return { users };
  }

  async deleteAccount(userId: string) {
    const user = await this.prisma.client.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.prisma.client.user.delete({
      where: { id: userId },
    });

    return { message: 'Account deleted successfully' };
  }
}
