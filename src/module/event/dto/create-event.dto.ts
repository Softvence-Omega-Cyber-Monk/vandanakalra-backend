import {
  IsNotEmpty,
  IsString,
  IsInt,
  IsOptional,
  IsDateString,
  Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateEventDto {
  @ApiProperty({
    example: 'Mathematics Workshop',
    description: 'Event title',
  })
  @IsNotEmpty({ message: 'Title is required!' })
  @IsString({ message: 'Title must be a string' })
  title: string;

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
  })
  @IsNotEmpty({ message: 'Point value is required!' })
  @IsInt({ message: 'Point value must be an integer' })
  @Min(0, { message: 'Point value must be at least 0' })
  pointValue: number;

  @ApiProperty({
    example: '2025-12-31',
    description: 'Event date (ISO format)',
  })
  @IsNotEmpty({ message: 'Date is required!' })
  @IsDateString({}, { message: 'Date must be in valid ISO format' })
  date: string;

  @ApiProperty({
    example: '10:30 AM',
    description: 'Event time',
  })
  @IsNotEmpty({ message: 'Time is required!' })
  @IsString({ message: 'Time must be a string' })
  time: string;

  @ApiProperty({
    example: 50,
    description: 'Maximum number of students allowed',
  })
  @IsNotEmpty({ message: 'Maximum students is required!' })
  @IsInt({ message: 'Maximum students must be an integer' })
  @Min(1, { message: 'Maximum students must be at least 1' })
  maxStudent: number;

  @ApiProperty({
    example: 'INSIDE',
    description: 'Event type (INSIDE or OUTSIDE)',
    required: false,
  })
  @IsOptional()
  @IsString({ message: 'Event type must be a string' })
  eventType?: string;
}
