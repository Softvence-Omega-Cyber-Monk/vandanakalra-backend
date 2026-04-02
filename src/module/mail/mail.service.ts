import { Injectable, InternalServerErrorException } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';

export interface StudentActivationPayload {
  to: string;
  studentId: string;
  tempPassword: string;
  activationLink: string;
  institutionName: string;
}

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;
  constructor(@InjectQueue('email') private emailQueue: Queue) {
    // FIX 1: When using 'service: gmail', you should NOT manually specify host, port, and secure: false,
    // as this creates a configuration conflict. Nodemailer handles GMail's secure SMTP (port 465, secure: true) automatically.
    this.transporter = nodemailer.createTransport({
      service: 'gmail', // Relying solely on the GMail service settings
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS, // IMPORTANT: Must be a GMail App Password
      },
    });
  }

  async sendMail(options: {
    to: string;
    subject: string;
    html: string;
    from?: string;
  }) {
    const mailOptions = {
      from: options.from || process.env.MAIL_FROM,
      to: options.to,
      subject: options.subject,
      html: options.html,
    };
    await this.transporter.sendMail(mailOptions);
    //this.logger.debug(`Sent to ${options.to} messageId=${info.messageId}`);
    //return info;
  }
}
