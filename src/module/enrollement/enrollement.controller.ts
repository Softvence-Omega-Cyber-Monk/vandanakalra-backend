// enrollment.controller.ts
import {
  Controller,
  Post,
  Put,
  Get,
  Body,
  Param,
  UseGuards,
  Req,
  HttpStatus,
  Res,
  Patch,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { EnrollementService } from './enrollement.service';
import { ClaimPointsDto, UpdateEnrollmentStatusDto } from './dto';
import sendResponse from 'src/module/utils/sendResponse';
import { Public } from 'src/common/decorators/public.decorators';
import { Roles } from 'src/common/decorators/roles.decorator';
import { userRole } from '@prisma';
import { ApiParam, ApiResponse } from '@nestjs/swagger';
import { NotificationService } from '../notification/notification.service';

@Controller('enrollments')
export class EnrollementController {
  constructor(private enrollmentService: EnrollementService) {}

  @Post('createEnroll/:eventId')
  @Roles(userRole.USER, userRole.ADMIN)
  @ApiParam({
    name: 'eventId',
    description: 'ID of the event',
    example: 'enr_abc123',
  })
  async createEnrollment(
    @Req() req: Request,
    @Res() res: Response,
    @Param('eventId') eventId: string,
  ) {
    const userId = req.user?.id as string;
    const result = await this.enrollmentService.createEnrollment(
      userId,
      eventId,
    );
    return sendResponse(res, {
      statusCode: HttpStatus.CREATED,
      success: true,
      message: 'Enrollment created successfully',
      data: result,
    });
  }

  @Put('approvePoint/:enrollmentId')
  @Roles(userRole.ADMIN)
  async updateEnrollmentStatus(
    @Req() req: Request,
    @Res() res: Response,
    @Body() body: UpdateEnrollmentStatusDto,
    @Param('enrollmentId') enrollmentId: string,
  ) {
    const result = await this.enrollmentService.updateEnrollmentStatus(
      enrollmentId,
      body,
    );
    return sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: 'Enrollment status updated and points awarded',
      data: result,
    });
  }

  @Patch('claim-points')
  @Roles(userRole.USER, userRole.ADMIN)
  @ApiResponse({
    status: 200,
    description: 'Points claimed successfully for multiple enrollments',
  })
  async claimPoints(
    @Body() claimDto: ClaimPointsDto,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const userId = req.user!.id; // assuming JWT strategy sets req.user

    const updatedEnrollments = await this.enrollmentService.claimPoints(
      claimDto,
      userId,
    );

    return sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: `Points claimed successfully for enrollment`,
      data: updatedEnrollments,
    });
  }

  @Get('AllClaimed-point')
  @Roles(userRole.ADMIN)
  async getClaimedJoinEnrollments(@Res() res: Response) {
    const data = await this.enrollmentService.getAllClaimedWithJoinStatus();
    return sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: 'Claimed JOIN enrollments retrieved successfully',
      data,
    });
  }

  @Public()
  @Patch('enventScann/:enrollmentId')
  async updateEnrollmentStatusToScanned(
    @Req() req: Request,
    @Res() res: Response,
    @Body() body: UpdateEnrollmentStatusDto,
    @Param('enrollmentId') enrollmentId: string,
  ) {
    const result = await this.enrollmentService.updateEnrollmentStatusToScanned(
      enrollmentId,
      body,
    );
    return sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: 'Enrollment status updated To scanned',
      data: result,
    });
  }

  // @Public()
  // @Get('me/join')
  // async getUserJoinEnrollments(@Req() req: Request, @Res() res: Response) {
  //   const userId = req.user?.id as string;
  //   const enrollments =
  //     await this.enrollmentService.getUserEnrollmentsWithJoinStatus(userId);
  //   return sendResponse(res, {
  //     statusCode: HttpStatus.OK,
  //     success: true,
  //     message: 'User join enrollments retrieved',
  //     data: enrollments,
  //   });
  // }
}
