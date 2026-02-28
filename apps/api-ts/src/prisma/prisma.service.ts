import { INestApplication, Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    // During early-stage development or performance testing we may not have a
    // real database available (e.g. running in a container without secrets).
    // Allow skipping the database connection by setting SKIP_DB=true in the
    // environment. This mirrors the behaviour in the e2e tests where Prisma is
    // stubbed manually.
    if (process.env.SKIP_DB === 'true') {
      console.warn('PrismaService: SKIP_DB enabled, skipping database connect');
      return;
    }

    await this.$connect();
  }

  async enableShutdownHooks(app: INestApplication) {
    // Use process hooks for shutdown instead of Prisma's $on
    process.on('SIGINT', async () => {
      await app.close();
    });
    process.on('SIGTERM', async () => {
      await app.close();
    });
  }
}
