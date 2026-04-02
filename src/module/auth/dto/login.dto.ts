import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    example: 'username123',
    description: 'User username',
  })
  @IsNotEmpty({ message: 'Username is required!' })
  username: string;

  @ApiProperty({
    example: 'token',
    description: 'fcm token',
  })
  @IsNotEmpty({ message: 'fcm token  is required!' })
  fcmToken: string;

  @ApiProperty({
    example: 'role',
    description: 'role',
  })
  @IsNotEmpty({ message: 'role  is required!' })
  role: string;

  @ApiProperty({
    example: '123456',
    description: 'User password (min 6 characters)',
  })
  @IsNotEmpty({ message: 'Password is required!' })
  password: string;
}
