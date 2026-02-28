import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { Observable } from 'rxjs';
import { FeatureFlag, FeatureFlagService } from './feature-flag.service';

/**
 * Feature flag service wrapper for migration control.
 * Implements traffic routing logic:
 * - V2_ENABLED: Controls v2 availability globally
 * - V2_PRIMARY: Routes traffic to v2 (vs v1)
 * - V1_DEPRECATED: Force clients to upgrade
 */
@Injectable()
export class FeatureFlagGuard {
  constructor(private readonly featureFlags: FeatureFlagService) {}

  async isV2Enabled(): Promise<boolean> {
    return this.featureFlags.isEnabled(FeatureFlag.V2_ENABLED);
  }

  async isV2Primary(): Promise<boolean> {
    return this.featureFlags.isEnabled(FeatureFlag.V2_PRIMARY);
  }

  async isV1Deprecated(): Promise<boolean> {
    return this.featureFlags.isEnabled(FeatureFlag.V1_DEPRECATED);
  }

  async validateV2Available(endpoint: string): Promise<void> {
    if (!await this.isV2Enabled()) {
      throw new HttpException(
        {
          statusCode: HttpStatus.SERVICE_UNAVAILABLE,
          message: `v2 API is temporarily unavailable (${endpoint})`,
          migrationStatus: this.featureFlags.getMigrationStatus(),
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
  }

  async logV2Usage(endpoint: string, statusCode: number, responseTime: number): Promise<void> {
    if (this.featureFlags.isEnabled(FeatureFlag.MIGRATION_LOGGING)) {
      console.log(`[MIGRATION] v2 endpoint: ${endpoint}, status: ${statusCode}, time: ${responseTime}ms`);
    }
  }
}

/**
 * Guard implementation for class-based usage.
 * Usage: @UseGuards(FeatureFlagV2Guard) on individual endpoints.
 */
@Injectable()
export class FeatureFlagV2Guard implements CanActivate {
  constructor(private readonly featureFlags: FeatureFlagService) {}

  canActivate(
    _context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const enabled = this.featureFlags.isEnabled(FeatureFlag.V2_ENABLED);

    if (!enabled) {
      throw new HttpException(
        {
          statusCode: HttpStatus.SERVICE_UNAVAILABLE,
          message: 'v2 API is temporarily unavailable',
          migrationStatus: this.featureFlags.getMigrationStatus(),
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    return true;
  }
}
