import { IsNotEmpty, IsString, IsIn, isBoolean, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Status } from '@prisma';

export class UpdateEnrollmentStatusDto {
  @ApiProperty({
    example: 'SCANNED',
    description: 'Status to set (JOIN | ATTENDED | REJECTED)',
    enum: Status,
  })
  @IsNotEmpty({ message: 'Status is required' })
  @IsEnum(Status, {
    message: 'Status must be one of: JOIN, ATTENDED, REJECTED',
  })
  status: Status;
}
