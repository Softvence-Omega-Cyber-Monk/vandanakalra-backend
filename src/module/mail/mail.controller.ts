import {
  Controller,
  Post,
  Body,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { SubscribeDto } from './dto/create-mail.dto';
import { MailService } from './mail.service';
import { Public } from '../../common/decorators/public.decorators';

@Public()
@Controller('newsletter')
@UsePipes(new ValidationPipe({ transform: true }))
export class MailController {
  constructor(private readonly MailService: MailService) {}

  // @Post('subscribe')
  //  async subscribe(@Body() subscribeDto: SubscribeDto) {
  //   const { email } = subscribeDto;
  //   await this.MailService.sendSubscriptionConfirmation(email);
  //   return {
  //     success: true,
  //     message: 'Successfully subscribed! Please check your inbox for a confirmation email.',
  //     email: email,
  //   };
  // }
}
