import { Module } from '@nestjs/common';
import { EventController } from './event.controller';
import { EventService } from './event.service';
import { PrismaModule } from 'src/module/prisma/prisma.module';
import { NotificationModule } from '../notification/notification.module';
import { EventReminderService } from './eventReminder.service';
import { S3Module } from '../s3/s3.module';

@Module({
  imports: [PrismaModule, NotificationModule, S3Module],
  controllers: [EventController],
  providers: [EventService, EventReminderService],
})
export class EventModule {}
