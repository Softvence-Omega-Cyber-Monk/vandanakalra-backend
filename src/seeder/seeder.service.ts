import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { PrismaService } from 'src/module/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { userRole } from '@prisma';

@Injectable()
export class SeederService implements OnApplicationBootstrap {
  constructor(private prisma: PrismaService) {}

  private readonly logger = new Logger(SeederService.name);

  async onApplicationBootstrap() {
    await this.seedAdmin();
  }

  private async seedAdmin() {
    const superAdminEmail =
      process.env.SUPER_ADMIN_EMAIL ?? process.env.ADMIN_EMAIL;
    const superAdminPassword =
      process.env.SUPER_ADMIN_PASSWORD ?? process.env.ADMIN_PASSWORD;
    const username =
      process.env.SUPER_ADMIN_USERNAME ?? process.env.ADMIN_USERNAME;
    const firstName =
      process.env.SUPER_ADMIN_FIRST_NAME ?? process.env.ADMIN_FIRST_NAME;
    const lastName =
      process.env.SUPER_ADMIN_LAST_NAME ?? process.env.ADMIN_LAST_NAME;

    if (!superAdminPassword || !username || !firstName || !lastName) {
      this.logger.warn(
        'Super admin seed skipped. Missing SUPER_ADMIN_* environment variables.',
      );
      return;
    }

    const supperAdmin = await this.prisma.client.user.findFirst({
      where: { role: userRole.SUPERADMIN },
    });

    if (supperAdmin) {
      this.logger.log('Super admin already exists, skipping seeding.');
      return;
    }

    const hashedPassword = await bcrypt.hash(superAdminPassword, 10);
    const existingUser = await this.prisma.client.user.findUnique({
      where: { username },
    });

    if (existingUser) {
      await this.prisma.client.user.update({
        where: { username },
        data: {
          firstname: firstName,
          lastname: lastName,
          password: hashedPassword,
          role: userRole.SUPERADMIN,
          isActive: true,
          isDeleted: false,
        },
      });

      this.logger.log(`Existing user promoted to super admin: ${username}`);
      return;
    }

    await this.prisma.client.user.create({
      data: {
        username,
        firstname: firstName,
        lastname: lastName,
        password: hashedPassword,
        role: userRole.SUPERADMIN,
        isActive: true,
      },
    });

    this.logger.log(`Default super admin created: ${superAdminEmail}`);
  }
}
