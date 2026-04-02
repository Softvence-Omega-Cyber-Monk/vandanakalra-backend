import { Module } from '@nestjs/common';
import { EnrollementController } from './enrollement.controller';
import { EnrollementService } from './enrollement.service';
import { NotificationModule } from '../notification/notification.module';

@Module({
  imports: [NotificationModule],
  controllers: [EnrollementController],
  providers: [EnrollementService],
})
export class EnrollementModule {}
