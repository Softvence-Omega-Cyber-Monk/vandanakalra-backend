import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './module/auth/auth.module';
import { PrismaModule } from './module/prisma/prisma.module';
import { MailModule } from './module/mail/mail.module';
import { MailerModule } from '@nestjs-modules/mailer';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SeederService } from './seeder/seeder.service';
import { EventModule } from './module/event/event.module';
import { EnrollementModule } from './module/enrollement/enrollement.module';
import { NotificationModule } from './module/notification/notification.module';
import { CloudinaryModule } from './module/cloudinary/cloudinary.module';
import { ScheduleModule } from '@nestjs/schedule';
import { S3Module } from './module/s3/s3.module';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        secret: await configService.getOrThrow('ACCESS_TOKEN_SECRET'),
        signOptions: {
          expiresIn: await configService.getOrThrow('ACCESS_TOKEN_EXPIREIN'),
        },
      }),
    }),

    MailerModule.forRootAsync({
      imports: [ConfigModule, ScheduleModule.forRoot()],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        transport: {
          host: config.get<string>('SMTP_HOST'),
          port: Number(config.get<string>('SMTP_PORT') || 587),
          secure: Number(config.get<string>('SMTP_PORT') || 587) === 465,
          auth: {
            user: config.get<string>('SMTP_USER'),
            pass: config.get<string>('SMTP_PASS'),
          },
        },
        defaults: {
          from:
            config.get<string>('SMTP_FROM') || config.get<string>('SMTP_USER'),
        },
      }),
    }),
    AuthModule,
    PrismaModule,
    MailModule,
    EventModule,
    EnrollementModule,
    NotificationModule,
    CloudinaryModule,
    S3Module,
  ],
  controllers: [AppController],
  providers: [AppService, SeederService],
  exports: [],
})
export class AppModule {}
