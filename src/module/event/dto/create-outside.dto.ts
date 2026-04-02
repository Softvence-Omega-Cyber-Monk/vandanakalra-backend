// dtos/create-outside-event.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsInt,
  Min,
  IsNotEmpty,
  IsDateString,
} from 'class-validator';

export class CreateOutsideEventDto {
  @ApiProperty({
    example: 'Community Clean-Up Day',
    description: 'The title of the outside event',
  })
  @IsString()
  title: string;

  @ApiProperty({
    example: 'Join us for a neighborhood clean-up to earn service points!',
    description: 'A brief description of the event (optional)',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    example: 50,
    description: 'Point value awarded for participating in the event',
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  pointValue: number;

  @ApiProperty({
    example: '2025-12-31',
    description: 'Event date (ISO format)',
  })
  @IsNotEmpty({ message: 'Date is required!' })
  @IsDateString({}, { message: 'Date must be in valid ISO format' })
  date: string;
}
