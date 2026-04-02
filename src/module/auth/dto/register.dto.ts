// register.dto.ts
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  Matches,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({
    example: 'mohin',
    description: 'User first name',
  })
  @IsNotEmpty({ message: 'First name is required!' })
  @IsString({ message: 'First name must be a string' })
  firstName: string;

  @ApiProperty({
    example: 'uddin',
    description: 'User last name',
  })
  @IsNotEmpty({ message: 'Last name is required!' })
  @IsString({ message: 'Last name must be a string' })
  lastName: string;

  @ApiProperty({
    example: 'humayun_kabir',
    description:
      'Unique username (3-20 characters, alphanumeric and underscores)',
  })
  @IsNotEmpty({ message: 'Username is required!' })
  @IsString({ message: 'Username must be a string' })
  @Matches(/^[a-zA-Z0-9_]{3,20}$/, {
    message:
      'Username must be 3-20 characters long and contain only letters, numbers, or underscores',
  })
  username: string;

  @ApiProperty({
    example: 'token',
    description: 'fcm token',
  })
  @IsNotEmpty({ message: 'fcm token  is required!' })
  fcmToken: string;

  @ApiProperty({
    example: '123456',
    description: 'User password (min 6 characters)',
  })
  @IsNotEmpty({ message: 'Password is required!' })
  @IsString({ message: 'Password must be a string' })
  password: string;
}
