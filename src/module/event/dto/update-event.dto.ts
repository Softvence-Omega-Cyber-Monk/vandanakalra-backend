import {
  IsOptional,
  IsString,
  IsInt,
  IsDateString,
  Min,
  IsIn,
  IsBoolean,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
export class UpdateEventDto {
  @ApiProperty({
    example: 'Mathematics Workshop',
    description: 'Event title',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Title must be a string' })
  title?: string;

  @ApiProperty({
    example: 'Learn advanced mathematics concepts',
    description: 'Event description',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Description must be a string' })
  description?: string;

  @ApiProperty({
    example: 100,
    description: 'Points awarded for attending event',
    required: false,
  })
  @IsOptional()
  @IsInt({ message: 'Point value must be an integer' })
  @Min(0, { message: 'Point value must be at least 0' })
  pointValue?: number;

  @ApiProperty({
    example: '2025-12-31',
    description: 'Event date (ISO format)',
    required: false,
  })
  @IsOptional()
  @IsDateString({}, { message: 'Date must be in valid ISO format' })
  date?: string;

  @ApiProperty({
    example: '10:30 AM',
    description: 'Event time',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Time must be a string' })
  time?: string;

  @ApiProperty({
    example: 50,
    description: 'Maximum number of students allowed',
    required: false,
  })
  @IsOptional()
  @IsInt({ message: 'Maximum students must be an integer' })
  @Min(1, { message: 'Maximum students must be at least 1' })
  maxStudent?: number;

  @ApiProperty({
    example: 'INSIDE',
    description: 'Event type (INSIDE or OUTSIDE)',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Event type must be a string' })
  eventType?: string;

  @ApiProperty({
    example: true,
    description: 'Whether to notify when event is approved',
    required: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'isEventApproveNotify must be a boolean' })
  isEventApproveNotify?: boolean;

  @ApiProperty({
    example: true,
    description: 'Whether to notify when a new event is created',
    required: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'isNewEventNotify must be a boolean' })
  isNewEventNotify?: boolean;

  @ApiProperty({
    example: true,
    description: 'Whether to send event reminder notifications',
    required: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'isEventReminder must be a boolean' })
  isEventReminder?: boolean;
}

export class ApproveOutsideEventDto {
  @ApiProperty({ example: 'eventafd' })
  @IsString()
  eventId: string;

  @ApiProperty({ enum: ['APPROVE', 'REJECT'], example: 'APPROVE' })
  @IsString()
  @IsIn(['APPROVE', 'REJECT'])
  isActiveOrReject: string;
}

export class NotificationEventDto {
  @ApiProperty({
    example: true,
    description: 'Whether to notify when event is approved',
    required: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'isEventApproveNotify must be a boolean' })
  isEventApproveNotify?: boolean;

  @ApiProperty({
    example: true,
    description: 'Whether to notify when a new event is created',
    required: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'isNewEventNotify must be a boolean' })
  isNewEventNotify?: boolean;

  @ApiProperty({
    example: true,
    description: 'Whether to send event reminder notifications',
    required: false,
  })
  @IsOptional()
  @IsBoolean({ message: 'isEventReminder must be a boolean' })
  isEventReminder?: boolean;
}

export class UpdateAdminSettingsDto {
  @ApiProperty({
    example: true,
    required: false,
    description: 'Auto-approve claimed points',
  })
  @IsOptional()
  @IsBoolean()
  adminAutoApprovePoint?: boolean;

  @ApiProperty({
    example: false,
    required: false,
    description: 'Allow users to create custom/outside events',
  })
  @IsOptional()
  @IsBoolean()
  adminAllowCustomPoint?: boolean;

  @ApiProperty({
    example: true,
    required: false,
    description: 'Send notification when a new event is created',
  })
  @IsOptional()
  @IsBoolean()
  adminCreateEventNotify?: boolean;

  @ApiProperty({
    example: false,
    required: false,
    description: 'Enable event reminder notifications',
  })
  @IsOptional()
  @IsBoolean()
  adminEventReminders?: boolean;
}

export class UpdateUserNotificationSettingsDto {
  @ApiProperty({
    example: true,
    required: false,
    description: 'Notify when event claim is approved',
  })
  @IsOptional()
  @IsBoolean()
  isEventApproveNotify?: boolean;

  @ApiProperty({
    example: true,
    required: false,
    description: 'Notify when a new event is created',
  })
  @IsOptional()
  @IsBoolean()
  isNewEventNotify?: boolean;

  @ApiProperty({
    example: true,
    required: false,
    description: 'Send event reminder notifications',
  })
  @IsOptional()
  @IsBoolean()
  isEventReminder?: boolean;
}
