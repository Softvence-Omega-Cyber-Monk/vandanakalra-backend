import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { S3Service } from '../s3/s3.service';
import { ROLES_KEY } from 'src/common/decorators/roles.decorator';
import { userRole } from '@prisma';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { UpdateUserPointDto } from './dto/update-account.dto';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<Pick<AuthService, 'updateUserPoint'>>;

  const res = () =>
    ({
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    }) as any;

  beforeEach(async () => {
    authService = {
      updateUserPoint: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: S3Service, useValue: {} },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('allows admins and superadmins to manually update user points', () => {
    const roles = Reflect.getMetadata(
      ROLES_KEY,
      controller.updateUserPoint,
    );

    expect(roles).toEqual([userRole.ADMIN, userRole.SUPERADMIN]);
  });

  it('updates user points and returns the standard response shape', async () => {
    const response = res();
    const serviceResult = {
      user: {
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
      },
    };

    authService.updateUserPoint.mockResolvedValue(serviceResult);

    await controller.updateUserPoint('user-1', { point: 120 }, response);

    expect(authService.updateUserPoint).toHaveBeenCalledWith('user-1', {
      point: 120,
    });
    expect(response.status).toHaveBeenCalledWith(HttpStatus.OK);
    expect(response.json).toHaveBeenCalledWith({
      statusCode: HttpStatus.OK,
      success: true,
      message: 'User points updated successfully',
      data: serviceResult,
    });
  });

  it('updates specific point type and returns full summary', async () => {
    const response = res();
    const serviceResult = {
      user: {
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
      },
      totalPoint: 75,
      eventPoint: 50,
      tutorPoint: 20,
      attendencePoint: 5,
    };

    authService.updateUserPoint.mockResolvedValue(serviceResult);

    await controller.updateUserPoint(
      'user-1',
      { point: 20, pointType: 'tutorpoint' as any },
      response,
    );

    expect(authService.updateUserPoint).toHaveBeenCalledWith('user-1', {
      point: 20,
      pointType: 'tutorpoint',
    });
    expect(response.status).toHaveBeenCalledWith(HttpStatus.OK);
    expect(response.json).toHaveBeenCalledWith({
      statusCode: HttpStatus.OK,
      success: true,
      message: 'User points updated successfully',
      data: serviceResult,
    });
  });

  it('validates point edit payloads including pointType', async () => {
    const validDto = plainToInstance(UpdateUserPointDto, { point: 120 });
    const validWithTutorType = plainToInstance(UpdateUserPointDto, {
      point: 20,
      pointType: 'tutorpoint',
    });
    const validWithEventType = plainToInstance(UpdateUserPointDto, {
      point: 40,
      pointType: 'eventpoint',
      reason: 'Bonus points',
    });
    const invalidTypeDto = plainToInstance(UpdateUserPointDto, {
      point: 20,
      pointType: 'invalid_type',
    });
    const negativeDto = plainToInstance(UpdateUserPointDto, { point: -1 });
    const decimalDto = plainToInstance(UpdateUserPointDto, { point: 10.5 });

    await expect(validate(validDto)).resolves.toHaveLength(0);
    await expect(validate(validWithTutorType)).resolves.toHaveLength(0);
    await expect(validate(validWithEventType)).resolves.toHaveLength(0);
    await expect(validate(invalidTypeDto)).resolves.not.toHaveLength(0);
    await expect(validate(negativeDto)).resolves.not.toHaveLength(0);
    await expect(validate(decimalDto)).resolves.not.toHaveLength(0);
  });
});
