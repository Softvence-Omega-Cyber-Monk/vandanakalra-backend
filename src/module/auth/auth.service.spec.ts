import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { MailerService } from '@nestjs-modules/mailer';
import { NotFoundException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationService } from '../notification/notification.service';
import { userRole } from '@prisma';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: any;

  beforeEach(async () => {
    prisma = {
      client: {
        user: {
          findUnique: jest.fn(),
          update: jest.fn(),
        },
        enrolled: {
          findMany: jest.fn().mockResolvedValue([]),
        },
        outsideEvent: {
          create: jest.fn(),
          findMany: jest.fn().mockResolvedValue([]),
        },
        attendence: {
          count: jest.fn().mockResolvedValue(0),
        },
        $transaction: jest.fn(async (callback) => callback(prisma.client)),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: {} },
        { provide: MailerService, useValue: {} },
        { provide: NotificationService, useValue: {} },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('manually sets a user point balance', async () => {
    const existingUser = {
      id: 'user-1',
      isDeleted: false,
    };
    const updatedUser = {
      id: 'user-1',
      firstname: 'Jane',
      lastname: 'Doe',
      username: 'jane@example.com',
      point: 120,
      role: userRole.USER,
      isActive: true,
      isDeleted: false,
      updatedAt: new Date(),
    };

    prisma.client.user.findUnique.mockResolvedValue(existingUser);
    prisma.client.user.update.mockResolvedValue(updatedUser);

    await expect(
      service.updateUserPoint('user-1', { point: 120 }),
    ).resolves.toEqual({ user: updatedUser });

    expect(prisma.client.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { point: 120 },
      select: {
        id: true,
        firstname: true,
        lastname: true,
        username: true,
        point: true,
        role: true,
        isActive: true,
        isDeleted: true,
        updatedAt: true,
      },
    });
  });

  it('updates a specific point type by creating an approved adjustment event', async () => {
    const existingUser = {
      id: 'user-1',
      isDeleted: false,
      point: 85,
    };
    const updatedUser = {
      id: 'user-1',
      firstname: 'Jane',
      lastname: 'Doe',
      username: 'jane@example.com',
      point: 75,
      role: userRole.USER,
      isActive: true,
      isDeleted: false,
      updatedAt: new Date(),
    };

    prisma.client.user.findUnique.mockResolvedValue(existingUser);
    prisma.client.enrolled.findMany.mockResolvedValue([
      { event: { pointValue: 30, eventType: 'tutorpoint' } },
      { event: { pointValue: 50, eventType: 'eventpoint' } },
    ]);
    prisma.client.outsideEvent.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          pointValue: -10,
          eventType: 'tutorpoint',
        },
      ]);
    prisma.client.attendence.count.mockResolvedValue(5);
    prisma.client.user.update.mockResolvedValue(updatedUser);
    prisma.client.outsideEvent.create.mockResolvedValue({
      id: 'adjustment-1',
    });

    await expect(
      service.updateUserPoint('user-1', {
        point: 20,
        pointType: 'tutorpoint' as any,
        reason: 'Correction',
      }),
    ).resolves.toEqual({
      user: updatedUser,
      totalPoint: 75,
      eventPoint: 50,
      tutorPoint: 20,
      attendencePoint: 5,
    });

    expect(prisma.client.outsideEvent.create).toHaveBeenCalledWith({
      data: {
        title: 'Manual point adjustment',
        description: 'Correction',
        pointValue: -10,
        approved: true,
        eventType: 'tutorpoint',
        userId: 'user-1',
      },
    });
    expect(prisma.client.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { point: 75 },
      select: {
        id: true,
        firstname: true,
        lastname: true,
        username: true,
        point: true,
        role: true,
        isActive: true,
        isDeleted: true,
        updatedAt: true,
      },
    });
  });

  it('returns manual point adjustment history for a user', async () => {
    const user = {
      id: 'user-1',
      firstname: 'Jane',
      lastname: 'Doe',
      username: 'jane@example.com',
      point: 75,
      isDeleted: false,
    };
    const adjustments = [
      {
        id: 'adjustment-1',
        title: 'Manual point adjustment',
        description: 'Correction',
        pointValue: -10,
        eventType: 'tutorpoint',
        approved: true,
        createdAt: new Date(),
      },
      {
        id: 'adjustment-2',
        title: 'Manual point adjustment',
        description: 'Bonus',
        pointValue: 5,
        eventType: 'eventpoint',
        approved: true,
        createdAt: new Date(),
      },
    ];

    prisma.client.user.findUnique.mockResolvedValue(user);
    prisma.client.outsideEvent.findMany.mockResolvedValue(adjustments);

    await expect(
      service.getUserPointAdjustmentHistory('user-1'),
    ).resolves.toEqual({
      user: {
        id: 'user-1',
        firstname: 'Jane',
        lastname: 'Doe',
        username: 'jane@example.com',
        point: 75,
      },
      adjustments,
      totalCount: 2,
      totalAdded: 5,
      totalDeducted: 10,
    });

    expect(prisma.client.outsideEvent.findMany).toHaveBeenCalledWith({
      where: {
        userId: 'user-1',
        approved: true,
        title: 'Manual point adjustment',
      },
      select: {
        id: true,
        title: true,
        description: true,
        pointValue: true,
        eventType: true,
        approved: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  });

  it('rejects point edits for a missing user', async () => {
    prisma.client.user.findUnique.mockResolvedValue(null);

    await expect(
      service.updateUserPoint('missing-user', { point: 50 }),
    ).rejects.toThrow(NotFoundException);

    expect(prisma.client.user.update).not.toHaveBeenCalled();
  });

  it('rejects point edits for a deleted user', async () => {
    prisma.client.user.findUnique.mockResolvedValue({
      id: 'deleted-user',
      isDeleted: true,
    });

    await expect(
      service.updateUserPoint('deleted-user', { point: 50 }),
    ).rejects.toThrow(NotFoundException);

    expect(prisma.client.user.update).not.toHaveBeenCalled();
  });
});
