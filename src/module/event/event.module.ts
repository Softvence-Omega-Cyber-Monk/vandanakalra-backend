import { Module } from '@nestjs/common';
import { EventController } from './event.controller';
import { EventService } from './event.service';
import { PrismaModule } from 'src/module/prisma/prisma.module';
import { NotificationModule } from '../notification/notification.module';
import { EventReminderService } from './eventReminder.service';

@Module({
  imports: [PrismaModule, NotificationModule],
  controllers: [EventController],
  providers: [EventService, EventReminderService],
})
export class EventModule {}
