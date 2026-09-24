import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { OutsideEventType } from '@prisma';

export class AccountActiveDto {
  @ApiProperty({
    description: 'User ID',
    type: String,
    required: true,
  })
  @IsString()
  userId: string;

  @ApiProperty({
    description: 'Action to perform: "APPROVE" or "REJECT"',
    enum: ['APPROVE', 'REJECT'],
    required: true,
  })
  @IsString()
  @IsIn(['APPROVE', 'REJECT'])
  isActiveOrReject: string;
}

export class ChangePasswordDto {
  @ApiProperty({
    example: 'oldPassword123',
    description: 'Your current password',
  })
  @IsString({ message: 'Old password must be a string.' })
  oldPassword: string;

  @ApiProperty({
    example: 'newSecurePass456',
    description: 'Your new password (minimum 6 characters)',
  })
  @IsString({ message: 'New password must be a string.' })
  newPassword: string;
}

export class UpdateUserProfileDto {
  @ApiProperty({
    description: 'The first name of the user',
    example: 'John',
    required: false,
  })
  @IsOptional()
  @IsString()
  firstname?: string;

  @ApiProperty({
    description: 'The last name of the user',
    example: 'Doe',
    required: false,
  })
  @IsOptional()
  @IsString()
  lastname?: string;

  @ApiProperty({
    type: 'string',
    format: 'binary',
    description: 'Profile image file (optional)',
    required: false,
  })
  @IsOptional()
  image?: any;
}

export class UpdateUserPointDto {
  @ApiProperty({
    description:
      'New total point balance, or new category balance when pointType is provided',
    example: 100,
    minimum: 0,
  })
  @Type(() => Number)
  @IsInt()
  @Min(0)
  point: number;

  @ApiPropertyOptional({
    description:
      'Specific point type to update. If omitted, updates the stored total points directly.',
    enum: OutsideEventType,
    example: OutsideEventType.tutorpoint,
  })
  @IsOptional()
  @IsEnum(OutsideEventType, {
    message: 'pointType must be either eventpoint or tutorpoint',
  })
  pointType?: OutsideEventType;

  @ApiPropertyOptional({
    description: 'Optional reason for the manual point adjustment',
    example: 'Admin correction',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}
