import { Module } from '@nestjs/common';
import { FeatureFlagService } from './feature-flag.service';
import { AdminController } from './admin.controller';

@Module({
  providers: [FeatureFlagService],
  controllers: [AdminController],
  exports: [FeatureFlagService],
})
export class CommonModule {}
