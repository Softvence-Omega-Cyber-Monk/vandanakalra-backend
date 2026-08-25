// src/auth/utils/auth-utils.ts

import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { PrismaClient, userRole } from '@prisma';
import { BadRequestException } from '@nestjs/common';

export async function getTokens(
  jwtService: JwtService,
  userId: string,
  username: string,
  role: userRole,
  userFirstName: string,
  userLastName: string,
) {
  const accessSecret = process.env.ACCESS_TOKEN_SECRET;
  const refreshSecret = process.env.REFRESH_TOKEN_SECRET;

  if (!accessSecret) {
    throw new Error(
      'ACCESS_TOKEN_SECRET is missing from environment variables (.env)',
    );
  }
  if (!refreshSecret) {
    throw new Error(
      'REFRESH_TOKEN_SECRET is missing from environment variables (.env)',
    );
  }

  const accessExpiresIn = process.env.ACCESS_TOKEN_EXPIREIN || '1d';
  const refreshExpiresIn = process.env.REFRESH_TOKEN_EXPIREIN || '7d';

  const [access_token, refresh_token] = await Promise.all([
    jwtService.signAsync(
      { id: userId, username, role, userFirstName, userLastName },
      {
        secret: accessSecret,
        expiresIn: accessExpiresIn,
      } as any,
    ),
    jwtService.signAsync(
      { id: userId, username, role, userFirstName, userLastName },
      {
        secret: refreshSecret,
        expiresIn: refreshExpiresIn,
      } as any,
    ),
  ]);

  return { access_token, refresh_token };
}

export function generateOtpCode() {
  return Math.floor(1000 + Math.random() * 9000).toString();
}

export async function hashOtpCode(code: string) {
  return bcrypt.hash(code, parseInt(process.env.SALT_ROUND!));
}

export async function verifyOtp(
  prisma: PrismaClient,
  email: string,
  code: string,
) {
  const otpRecord = await prisma.otpCode.findFirst({
    where: { email, verified: false },
    orderBy: { createdAt: 'desc' },
  });

  if (!otpRecord || otpRecord.expiresAt < new Date()) {
    throw new BadRequestException('Invalid or expired code');
  }

  const isValid = await bcrypt.compare(code, otpRecord.code);
  if (!isValid) {
    throw new BadRequestException('Incorrect code');
  }

  await prisma.otpCode.update({
    where: { id: otpRecord.id },
    data: { verified: true },
  });

  return { message: 'OTP verified successfully' };
}
