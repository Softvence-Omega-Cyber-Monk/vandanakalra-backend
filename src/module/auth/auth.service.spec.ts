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
          findMany: jest.fn().mockResolvedValue([]),
        },
        attendence: {
          count: jest.fn().mockResolvedValue(0),
        },
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
      tutorAdjustment: 0,
      eventAdjustment: 0,
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
        tutorAdjustment: true,
        eventAdjustment: true,
        role: true,
        isActive: true,
        isDeleted: true,
        updatedAt: true,
      },
    });
  });

  it('adjusts tutorpoint and updates total points accordingly', async () => {
    const existingUser = {
      id: 'user-1',
      point: 85,
      tutorAdjustment: 0,
      eventAdjustment: 0,
      isDeleted: false,
    };

    prisma.client.user.findUnique.mockResolvedValue(existingUser);
    prisma.client.enrolled.findMany.mockResolvedValue([
      { event: { pointValue: 30, eventType: 'tutorpoint' } },
    ]);
    prisma.client.outsideEvent.findMany.mockResolvedValue([]);
    prisma.client.attendence.count.mockResolvedValue(0);

    const updatedUser = {
      id: 'user-1',
      firstname: 'Jane',
      lastname: 'Doe',
      username: 'jane@example.com',
      point: 75,
      tutorAdjustment: -10,
      eventAdjustment: 0,
      role: userRole.USER,
      isActive: true,
      isDeleted: false,
      updatedAt: new Date(),
    };
    prisma.client.user.update.mockResolvedValue(updatedUser);

    const result = await service.updateUserPoint('user-1', {
      point: 20,
      pointType: 'tutorpoint' as any,
    });

    expect(prisma.client.user.update).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: {
        point: 75,
        tutorAdjustment: { increment: -10 },
      },
      select: {
        id: true,
        firstname: true,
        lastname: true,
        username: true,
        point: true,
        tutorAdjustment: true,
        eventAdjustment: true,
        role: true,
        isActive: true,
        isDeleted: true,
        updatedAt: true,
      },
    });

    expect(result).toHaveProperty('user');
    expect(result).toHaveProperty('tutorPoint');
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
