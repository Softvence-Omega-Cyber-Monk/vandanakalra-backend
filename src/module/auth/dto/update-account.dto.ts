import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsIn,
  IsOptional,
  IsString,
  isString,
  MinLength,
} from 'class-validator';

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
