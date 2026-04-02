import { IsEmail, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
export class CreateMailDto {}
export class SubscribeDto {
  @ApiProperty({
    example: 'subscribe@example.com',
    description: 'Email address of the subscribe',
  })
  @IsNotEmpty()
  @IsEmail()
  email: string;
}

export interface SendMailOptions {
  to: string | string[]; // Recipient email
  subject: string; // Email subject
  text?: string; // Plain text content (fallback)
  html: string; // HTML template
  from?: string; // Optional sender address (defaulted in service)
}
