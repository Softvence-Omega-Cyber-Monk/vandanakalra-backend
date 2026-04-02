import {
  IsNotEmpty,
  IsInt,
  Min,
  IsArray,
  ArrayMinSize,
  IsUUID,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ClaimPointsDto {
  @ApiProperty({
    description: 'Array of enrollment IDs to claim points for',
    example: ['99d71ab2-b918-4846-9504-a1b3370e566f', 'a1b2c3d4-...'],
    isArray: true,
    type: String,
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID(undefined, { each: true })
  enrolledIds: string[];
}
