import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateEnrollementDto {
  @ApiProperty({ example: 'event-uuid', description: 'Event id to enroll' })
  @IsNotEmpty({ message: 'Event id is required' })
  @IsString()
  eventId: string;
}
