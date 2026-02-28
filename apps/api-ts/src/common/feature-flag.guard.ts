import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { FeatureFlagService } from './feature-flag.service';

/**
 * Feature flag middleware for migration control
 * Implements traffic routing logic:
 * - V2_ENABLED: Controls v2 availability globally
 * - V2_PRIMARY: Routes traffic to v2 (vs v1)
 * - V1_DEPRECATED: Force clients to upgrade
 */
@Injectable()
export class FeatureFlagGuard {
  constructor(private readonly featureFlags: FeatureFlagService) {}

  /**
   * Check if v2 API is enabled
   * Used in @UseGuards(FeatureFlagGuard) on v2 endpoints
   */
  async isV2Enabled(): Promise<boolean> {
    return this.featureFlags.isEnabled('V2_ENABLED');
  }

  /**
   * Check if v2 is primary (receives traffic)
   */
  async isV2Primary(): Promise<boolean> {
    return this.featureFlags.isEnabled('V2_PRIMARY');
  }

  /**
   * Get v1 depreation status
   */
  async isV1Deprecated(): Promise<boolean> {
    return this.featureFlags.isEnabled('V1_DEPRECATED');
  }

  /**
   * Reject request if v2 is disabled (killswitch)
   */
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

  /**
   * Log v2 usage if migration logging enabled
   * Used to track traffic during shadow mode / cutover
   */
  async logV2Usage(endpoint: string, statusCode: number, responseTime: number): Promise<void> {
    if (this.featureFlags.isEnabled('MIGRATION_LOGGING')) {
      console.log(`[MIGRATION] v2 endpoint: ${endpoint}, status: ${statusCode}, time: ${responseTime}ms`);
    }
  }
}

/**
 * Alternative: Guard implementation for class-based usage
 * Usage: @UseGuards(FeatureFlagV2Guard) on individual endpoints
 */
import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class FeatureFlagV2Guard implements CanActivate {
  constructor(private readonly featureFlags: FeatureFlagService) {}

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const enabled = this.featureFlags.isEnabled('V2_ENABLED');
    
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
