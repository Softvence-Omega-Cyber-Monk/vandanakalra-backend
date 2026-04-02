import { Module } from '@nestjs/common';
import { MailService } from './mail.service';
import { MailerModule } from '@nestjs-modules/mailer';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';
import { MailProcessor } from './mail.processor';

@Module({
  imports: [
    MailerModule,
    ConfigModule,
    // 1. Register the dedicated 'email' queue
    BullModule.registerQueue({
      name: 'email',
    }),
  ],
  providers: [MailService, MailProcessor],
  exports: [MailService],
})
export class MailModule {}
