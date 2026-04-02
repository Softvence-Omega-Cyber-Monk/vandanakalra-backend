import {
  Body,
  Controller,
  HttpStatus,
  Post,
  Put,
  Get,
  Delete,
  Param,
  Req,
  Res,
  Patch,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { EventService } from './event.service';
import { CreateEventDto, UpdateEventDto } from './dto';
import sendResponse from '../utils/sendResponse';
import type { Request, Response } from 'express';
import { ApiBody, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { Public } from 'src/common/decorators/public.decorators';
import { Roles } from 'src/common/decorators/roles.decorator';
import { userRole } from '@prisma';
import { CreateOutsideEventDto } from './dto/create-outside.dto';
import {
  ApproveOutsideEventDto,
  NotificationEventDto,
  UpdateAdminSettingsDto,
  UpdateUserNotificationSettingsDto,
} from './dto/update-event.dto';

@Controller('event')
export class EventController {
  constructor(private eventService: EventService) {}

  // Create event
  @Post('create-event')
  @Roles(userRole.ADMIN)
  @ApiOperation({
    summary: 'Create a new event',
    description: 'Creates a new event for the authenticated user',
  })
  @ApiBody({
    description: 'Event data to create',
    type: CreateEventDto,
  })
  @ApiResponse({
    status: 201,
    description: 'Event created successfully.',
  })
  async createEvent(
    @Body() dto: CreateEventDto,
    @Res() res: Response,
    // @Req() req: Request,
  ) {
    //   const userId = (req as any).user?.id;
    const result = await this.eventService.createEvent(dto);

    return sendResponse(res, {
      statusCode: HttpStatus.CREATED,
      success: true,
      message: 'Event created successfully',
      data: result,
    });
  }

  @Post('create-outside-event')
  @ApiOperation({
    summary: 'Create a new outside event',
    description: 'Creates a new outside event (requires admin role)',
  })
  @ApiBody({
    description: 'Data for the outside event',
    type: CreateOutsideEventDto,
  })
  @ApiResponse({
    status: 201,
    description: 'Outside event created successfully.',
  })
  async createOutsideEvent(
    @Body() dto: CreateOutsideEventDto,
    @Res() res: Response,
    @Req() req: Request,
  ) {
    // You can pass userId from request if needed (e.g., for audit)
    // For now, keeping it optional as per your service signature
    const userId = req.user!.id;
    const result = await this.eventService.createOutsideEvent(dto, userId);

    return sendResponse(res, {
      statusCode: HttpStatus.CREATED,
      success: true,
      message: 'Outside event created successfully',
      data: result,
    });
  }

  @Get('unapproved-outside-event')
  @Roles(userRole.ADMIN)
  @ApiOperation({
    summary: 'Get all unapproved outside events',
    description: 'Returns a list of outside events pending approval',
  })
  @ApiResponse({
    status: 200,
    description: 'Successfully retrieved unapproved events',
  })
  async getUnapprovedOutsideEvents(@Res() res: Response) {
    const events = await this.eventService.getUnapprovedOutsideEvents();

    return sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: 'Unapproved outside events retrieved successfully',
      data: events,
    });
  }

  @Patch('approveOrReject-outside-event')
  @Roles(userRole.ADMIN)
  @ApiOperation({
    summary: 'Approve an outside event and award points if user attended',
  })
  async approveOutsideEvent(
    @Body() dto: ApproveOutsideEventDto,
    @Res() res: Response,
  ) {
    const result = await this.eventService.approveOutsideEvent(dto);

    return sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: 'successfully  done  Oparation',
      data: result,
    });
  }

  @Get('get-outside-userApproved-events')
  @Roles(userRole.ADMIN, userRole.ADMIN)
  @ApiOperation({
    summary: 'Get approved outside events for a specific user with summary',
  })
  @ApiResponse({ status: 200, description: 'Successfully retrieved data' })
  async getUserApprovedOutsideEvents(
    @Res() res: Response,
    @Req() req: Request,
  ) {
    // Optional: Validate user exists
    const userId = req.user!.id;

    const result =
      await this.eventService.getUserApprovedOutsideEventsWithSummary(userId);

    return sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: 'Approved outside events retrieved successfully',
      data: result,
    });
  }

  @Delete('delete-outside-event/:id')
  @Roles(userRole.ADMIN) // or extend logic to allow event owner
  @ApiOperation({
    summary: 'Delete an unapproved outside event',
    description: 'O nly unapproved events can be deleted',
  })
  @ApiParam({ name: 'id', description: 'ID of the outside event' })
  @ApiResponse({ status: 200, description: 'Event deleted successfully' })
  @ApiResponse({ status: 400, description: 'Event is approved or invalid' })
  @ApiResponse({ status: 404, description: 'Event not found' })
  async deleteUnapprovedOutsideEvent(
    @Param('id') eventId: string,
    @Res() res: Response,
  ) {
    const result =
      await this.eventService.deleteUnapprovedOutsideEvent(eventId);

    return sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      data: result,
    });
  }

  // Update event
  @Put('update-event/:eventId')
  @Roles(userRole.ADMIN)
  @ApiOperation({
    summary: 'Update an event',
    description: 'Updates an existing event (only owner can update)',
  })
  @ApiBody({
    description: 'Event data to update',
    type: UpdateEventDto,
  })
  @ApiResponse({
    status: 200,
    description: 'Event updated successfully.',
  })
  async updateEvent(
    @Param('eventId') eventId: string,
    @Body() dto: UpdateEventDto,
    @Res() res: Response,
    // @Req() req: Request,
  ) {
    //   const userId = (req as any).user?.id;
    const result = await this.eventService.updateEvent(eventId, dto);

    return sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: 'Event updated successfully',
      data: result,
    });
  }

  @Put('update-notification-settings') // ← No eventId needed
  @ApiBody({ type: NotificationEventDto })
  @ApiResponse({ status: 200, description: 'Notification settings updated' })
  async NotificationEventUpdate(
    @Body() dto: NotificationEventDto,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const userId = (req as any).user?.id;

    const result = await this.eventService.NotificationEventUpdate(userId, dto);

    return sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: 'Notification toggle updated',
      data: result,
    });
  }
  // Get all events
  @Public()
  @Get()
  @ApiOperation({
    summary: 'Get all events',
    description: 'Retrieves all available events',
  })
  @ApiResponse({
    status: 200,
    description: 'Events retrieved successfully.',
  })
  async getAllEvents(@Res() res: Response) {
    const result = await this.eventService.getAllEvents();

    return sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: 'Events retrieved successfully',
      data: result,
    });
  }

  @Get('attendedEventByUser')
  @Roles(userRole.ADMIN, userRole.USER)
  @ApiResponse({
    status: 200,
    description: 'Attended events and stats retrieved successfully',
  })
  async getAttendedEvents(@Res() res: Response, @Req() req: Request) {
    const userId = (req as any).user?.id;
    const result = await this.eventService.getAttendedEventsWithStats(userId);

    return sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: 'Attended events retrieved successfully',
      data: result,
    });
  }

  @Get('joinEventByUser')
  @Roles(userRole.ADMIN, userRole.USER)
  @ApiResponse({
    status: 200,
    description: 'Attended events and stats retrieved successfully',
  })
  async getJoinEvents(@Res() res: Response, @Req() req: Request) {
    const userId = (req as any).user?.id;
    const result = await this.eventService.getJoinEventsWithStats(userId);

    return sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: 'Attended events retrieved successfully',
      data: result,
    });
  }


  @Get('scannedEventByUser')
  @Roles(userRole.ADMIN, userRole.USER)
  @ApiResponse({
    status: 200,
    description: 'Scanned events and stats retrieved successfully',
  })
  async getScannedEventByUser(@Res() res: Response, @Req() req: Request) {
    const userId = (req as any).user?.id;
    const result = await this.eventService.getScannedEventByUser(userId);

    return sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: 'Scanned events retrieved successfully',
      data: result,
    });
  }

  @Get('upcoming')
  async getUpcomingEvents(@Req() req: Request, @Res() res: Response) {
    const userId = req.user!.id;
    const result = await this.eventService.getUpcomingEvents(userId);
    return sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: 'Upcoming events retrieved successfully',
      data: result,
    });
  }

  @Get('getUserSettings')
  @Roles(userRole.USER)
  async getUserNotificationSettings(@Req() req: Request, @Res() res: Response) {
    const userId = req.user!.id;
    const result = await this.eventService.getUserNotificationSettings(userId);
    return sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: 'User notification settings retirived successfully',
      data: result,
    });
  }

  @Get('getAdminSettings')
  @Roles(userRole.ADMIN)
  async getAdminSettings(@Req() req: Request, @Res() res: Response) {
    const userId = req.user!.id;
    const result = await this.eventService.getAdminSettings(userId);
    return sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: 'admin settings retrieved successfully',
      data: result,
    });
  }

  @Put('updateAdminSettings')
  @Roles(userRole.ADMIN)
  async updateAdminSettings(
    @Body() dto: UpdateAdminSettingsDto,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const userId = req.user!.id;
    const result = await this.eventService.updateAdminSettings(dto, userId);
    return sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: 'admin settings updated successfully',
      data: result,
    });
  }

  // Get event by ID
  @Public()
  @Get(':eventId')
  @ApiOperation({
    summary: 'Get event by ID',
    description: 'Retrieves a specific event with all enrolled students',
  })
  @ApiResponse({
    status: 200,
    description: 'Event retrieved successfully.',
  })
  async getEventById(@Param('eventId') eventId: string, @Res() res: Response) {
    const result = await this.eventService.getEventById(eventId);

    return sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: 'Event retrieved successfully',
      data: result,
    });
  }

  @Delete(':eventId')
  @Roles(userRole.ADMIN)
  @ApiOperation({
    summary: 'Delete an event',
    description: 'Deletes an event (only owner can delete)',
  })
  @ApiResponse({
    status: 200,
    description: 'Event deleted successfully.',
  })
  async deleteEvent(
    @Param('eventId') eventId: string,
    @Res() res: Response,
    @Req() req: Request,
  ) {
    // const userId = (req as any).user?.id;
    const result = await this.eventService.deleteEvent(eventId);

    return sendResponse(res, {
      statusCode: HttpStatus.OK,
      success: true,
      message: 'Event deleted successfully',
      data: result,
    });
  }
}
