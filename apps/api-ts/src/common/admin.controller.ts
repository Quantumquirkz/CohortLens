import { Controller, Get, Post, Body, UseGuards, HttpException, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { FeatureFlagService, FeatureFlag } from './feature-flag.service';

interface SetFlagRequest {
  flag: FeatureFlag;
  enabled: boolean;
}

/**
 * Admin controller for operational tasks during migration
 * All endpoints require authentication and should be admin-only in production
 */
@ApiTags('admin')
@Controller('/api/v2/admin')
export class AdminController {
  constructor(private featureFlags: FeatureFlagService) {}

  /**
   * Health check for admin monitoring
   */
  @Get('/health')
  health() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Get current feature flags state (no auth required for visibility)
   */
  @Get('/flags')
  getFlags() {
    return {
      flags: this.featureFlags.getAllFlags(),
      migration_status: this.featureFlags.getMigrationStatus(),
    };
  }

  /**
   * Set feature flag (admin-only endpoint)
   * In production, this should verify admin role
   */
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('/flags')
  setFlag(@Body() request: SetFlagRequest) {
    // In production, add: @Roles('admin') decorator
    // For now, require auth as basic protection

    if (!Object.values(FeatureFlag).includes(request.flag)) {
      throw new HttpException('Invalid flag name', HttpStatus.BAD_REQUEST);
    }

    this.featureFlags.setFlag(request.flag, request.enabled);

    return {
      message: `Flag ${request.flag} set to ${request.enabled}`,
      flags: this.featureFlags.getAllFlags(),
      migration_status: this.featureFlags.getMigrationStatus(),
    };
  }

  /**
   * Trigger migration cutover (v1 -> v2)
   * Sets necessary flags for smooth transition
   */
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('/migrate-to-v2')
  migrateToV2() {
    // Step 1: Enable v2 as primary
    this.featureFlags.setFlag(FeatureFlag.V2_PRIMARY, true);
    // Step 2: Keep v1 active temporarily (for rollback)
    this.featureFlags.setFlag(FeatureFlag.V1_DEPRECATED, false);
    // Step 3: Enable shadow logging for tracking
    this.featureFlags.setFlag(FeatureFlag.MIGRATION_LOGGING, true);

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
  rollbackToV1() {
    this.featureFlags.setFlag(FeatureFlag.V2_PRIMARY, false);
    this.featureFlags.setFlag(FeatureFlag.V1_DEPRECATED, false);

    return {
      message: 'Rollback to v1 completed',
      flags: this.featureFlags.getAllFlags(),
      migration_status: this.featureFlags.getMigrationStatus(),
      next_step: 'Investigate v2 issues, then retry migration',
    };
  }

  /**
   * Enable shadow mode (dual write without traffic shift)
   * Useful for validation before cutover
   */
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('/enable-shadow-mode')
  enableShadowMode() {
    this.featureFlags.setFlag(FeatureFlag.SHADOW_MODE, true);
    this.featureFlags.setFlag(FeatureFlag.V2_ENABLED, true);

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
  completeV1Deprecation() {
    this.featureFlags.setFlag(FeatureFlag.V2_PRIMARY, true);
    this.featureFlags.setFlag(FeatureFlag.V1_DEPRECATED, true);

    return {
      message: 'V1 deprecation completed (v1 endpoints returning 410 Gone)',
      flags: this.featureFlags.getAllFlags(),
      migration_status: this.featureFlags.getMigrationStatus(),
      final_step: 'Remove apps/api and apps/frontend from repository',
    };
  }
}
