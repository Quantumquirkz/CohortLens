import { Controller, Get, Post, Body, UseGuards, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FeatureFlagService, FeatureFlag } from './feature-flag.service';

interface SetFlagRequest {
  flag: FeatureFlag;
  enabled: boolean;
}

/**
 * Admin controller for operational tasks during migration.
 * Mutation endpoints require JWT authentication.
 * Read-only endpoints (health, flags GET) are public for monitoring.
 */
@ApiTags('admin')
@Controller('/api/v2/admin')
export class AdminController {
  constructor(private featureFlags: FeatureFlagService) {}

  /**
   * Health check for admin monitoring (public, read-only)
   */
  @Get('/health')
  health() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get current feature flags state (public, read-only for visibility)
   */
  @Get('/flags')
  getFlags() {
    return {
      flags: this.featureFlags.getAllFlags(),
      migration_status: this.featureFlags.getMigrationStatus(),
    };
  }

  /**
   * Set feature flag (JWT required)
   */
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('/flags')
  async setFlag(@Body() request: SetFlagRequest) {
    if (!Object.values(FeatureFlag).includes(request.flag)) {
      throw new HttpException('Invalid flag name', HttpStatus.BAD_REQUEST);
    }

    await this.featureFlags.setFlag(request.flag, request.enabled);

    return {
      message: `Flag ${request.flag} set to ${request.enabled}`,
      flags: this.featureFlags.getAllFlags(),
      migration_status: this.featureFlags.getMigrationStatus(),
    };
  }

  /**
   * Trigger migration cutover (v1 -> v2)
   */
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('/migrate-to-v2')
  async migrateToV2() {
    await this.featureFlags.setFlag(FeatureFlag.V2_PRIMARY, true);
    await this.featureFlags.setFlag(FeatureFlag.V1_DEPRECATED, false);
    await this.featureFlags.setFlag(FeatureFlag.MIGRATION_LOGGING, true);

    return {
      message: 'Migration cutover initiated (v2 primary, v1 still available)',
      flags: this.featureFlags.getAllFlags(),
      migration_status: this.featureFlags.getMigrationStatus(),
      next_step: 'Monitor error rates and traffic, then set v1_deprecated=true when ready',
    };
  }

  /**
   * Rollback to v1 (emergency)
   */
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('/rollback-to-v1')
  async rollbackToV1() {
    await this.featureFlags.setFlag(FeatureFlag.V2_PRIMARY, false);
    await this.featureFlags.setFlag(FeatureFlag.V1_DEPRECATED, false);

    return {
      message: 'Rollback to v1 completed',
      flags: this.featureFlags.getAllFlags(),
      migration_status: this.featureFlags.getMigrationStatus(),
      next_step: 'Investigate v2 issues, then retry migration',
    };
  }

  /**
   * Enable shadow mode (dual write without traffic shift)
   */
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('/enable-shadow-mode')
  async enableShadowMode() {
    await this.featureFlags.setFlag(FeatureFlag.SHADOW_MODE, true);
    await this.featureFlags.setFlag(FeatureFlag.V2_ENABLED, true);

    return {
      message: 'Shadow mode enabled (v1 primary, v2 shadows traffic)',
      flags: this.featureFlags.getAllFlags(),
      migration_status: this.featureFlags.getMigrationStatus(),
      note: 'V2 will receive copies of requests, but v1 responses will be returned to clients',
    };
  }

  /**
   * Complete deprecation (remove v1)
   */
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('/complete-v1-deprecation')
  async completeV1Deprecation() {
    await this.featureFlags.setFlag(FeatureFlag.V2_PRIMARY, true);
    await this.featureFlags.setFlag(FeatureFlag.V1_DEPRECATED, true);

    return {
      message: 'V1 deprecation completed (v1 endpoints returning 410 Gone)',
      flags: this.featureFlags.getAllFlags(),
      migration_status: this.featureFlags.getMigrationStatus(),
      final_step: 'Remove apps/api and apps/frontend from repository',
    };
  }
}
