import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { PrismaModule } from './prisma/prisma.module';
import { CommonModule } from './common/common.module';
import { FeatureFlagMiddleware } from './common/feature-flag.middleware';
import { DefiModule } from './defi/defi.module';
import { ZkModule } from './zk/zk.module';
import { PredictModule } from './predict/predict.module';
import { NftModule } from './nft/nft.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60000,
        limit: 1000,
      },
      {
        name: 'auth',
        ttl: 60000,
        limit: 10,
      },
    ]),
    PrismaModule,
    AuthModule,
    AnalyticsModule,
    CommonModule,
    DefiModule,
    ZkModule,
    PredictModule,
    NftModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply feature flag middleware to all v2 endpoints
    consumer
      .apply(FeatureFlagMiddleware)
      .forRoutes('/api/v2/*');
  }
}
