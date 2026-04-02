// src/mail/mail.processor.ts
import { Process, Processor } from '@nestjs/bull';
import type { Job } from 'bull';
import { MailService, StudentActivationPayload } from './mail.service'; // Assuming MailService exports the payload type
import { Logger } from '@nestjs/common';

@Processor('email') // This connects to the 'email' queue
export class MailProcessor {
  private readonly logger = new Logger(MailProcessor.name);

  constructor(private readonly mailService: MailService) {}

  // NOTE: You can add more processors for other email types (e.g., 'password-reset')
}
