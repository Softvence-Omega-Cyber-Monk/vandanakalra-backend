import { IsNotEmpty, IsString, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ForgotPasswordDto {
  @ApiProperty({
    description: 'The unique username of the user',
    example: 'mohin_user',
  })
  @IsNotEmpty()
  @IsString()
  username: string;

  @ApiProperty({
    description: 'FCM device registration token for push notification',
    example:
      'f91M40sUS36Shofdc5Q95y:APA91bGFm95AxYks3_xHeOr4I6oKtnxh9KDRcl0yTS1Y6-df0X2yONmsxxeqAZIUiNmloMbQNdizawlGkugUpPh0yTfEVWXNunBGsFP5VhVjQpBVhADN-Vc',
    minLength: 10,
    maxLength: 255,
  })
  @IsNotEmpty()
  @IsString()
  @Length(10, 255, { message: 'FCM token must be valid' })
  fcmToken: string;
}

export class ResetPasswordDto {
  @ApiProperty({
    description: 'FCM tokent sent via FCM notification',
    example: '1234',
  })
  @IsNotEmpty()
  @IsString()
  token: string;

  @ApiProperty({
    description: 'New password — must be exactly 6 characters long',
    example: '987678', // or 'aB3!', if non-numeric allowed
  })
  @IsNotEmpty()
  @IsString()
  newPassword: string;
}
