import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID, IsEnum } from 'class-validator';
import { AttendanceStatus } from '@prisma';

export class CreateAttendanceDto {
  @ApiProperty({
    description: 'id to mark attendance for',
    example: 'a1b2c3d4-...',
  })
  @IsString()
  id: string;
}
