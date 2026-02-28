import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export enum FeatureFlag {
  /**
   * When true (default false): route requests to v2 only
   * When false: v1 is still active, v2 is behind feature flag
   */
  V2_PRIMARY = 'v2_primary',

  /**
   * When true (default true): v2 endpoints accept requests normally
   * When false: v2 endpoints return 503 Service Unavailable
   */
  V2_ENABLED = 'v2_enabled',

  /**
   * When true (default false): v1 endpoints return 410 Gone
   * When false: v1 endpoints still work
   */
  V1_DEPRECATED = 'v1_deprecated',

  /**
   * When true (default false): enable read-ahead logging for migration tracking
   */
  MIGRATION_LOGGING = 'migration_logging',

  /**
   * When true (default false): shadow traffic to v2 even if v1 is primary
   */
  SHADOW_MODE = 'shadow_mode',
}

interface FlagState {
  [key: string]: boolean;
}

/**
 * Feature flag service for gradual migration control
 * 
 * Timeline example:
 * Week 1-2: v1=primary, v2_enabled=true (beta testing)
 * Week 2-3: shadow_mode=true (shadow traffic to v2)
 * Week 3-4: v2_primary=true, v1_deprecated=false (cut over)
 * Week 4+:  v1_deprecated=true, v2_primary=true (cleanup)
 */
@Injectable()
export class FeatureFlagService {
  private flags: FlagState = {};

  constructor(private config: ConfigService) {
    this.loadFlags();
  }

  /**
   * Load flags from environment variables
   * Format: FEATURE_FLAG_V2_PRIMARY=true
   */
  private loadFlags() {
    Object.values(FeatureFlag).forEach(flag => {
      const envKey = `FEATURE_FLAG_${flag.toUpperCase()}`;
      const value = this.config.get<string>(envKey, 'false');
      this.flags[flag] = value.toLowerCase() === 'true';
    });
  }

  /**
   * Check if a feature is enabled
   */
  isEnabled(flag: FeatureFlag): boolean {
    return this.flags[flag] ?? false;
  }

  /**
   * Set flag state (admin-only in production)
   */
  setFlag(flag: FeatureFlag, enabled: boolean): void {
    this.flags[flag] = enabled;
  }

  /**
   * Get all flags
   */
  getAllFlags(): Readonly<FlagState> {
    return Object.freeze({ ...this.flags });
  }

  /**
   * Migration status helper
   */
  getMigrationStatus(): {
    phase: string;
    v1_active: boolean;
    v2_active: boolean;
    shadow_mode: boolean;
  } {
    const v1Active = !this.isEnabled(FeatureFlag.V1_DEPRECATED);
    const v2Active = this.isEnabled(FeatureFlag.V2_ENABLED);
    const v2Primary = this.isEnabled(FeatureFlag.V2_PRIMARY);
    const shadowMode = this.isEnabled(FeatureFlag.SHADOW_MODE);

    let phase: string;
    if (!v1Active && v2Active && v2Primary) {
      phase = 'PHASE_4_COMPLETE';
    } else if (v2Primary && v1Active) {
      phase = 'PHASE_3_CUTOVER';
    } else if (shadowMode && v1Active) {
      phase = 'PHASE_2_BETA_SHADOW';
    } else if (v2Active && v1Active && !v2Primary) {
      phase = 'PHASE_1_BETA';
    } else {
      phase = 'UNKNOWN';
    }

    return {
      phase,
      v1_active: v1Active,
      v2_active: v2Active,
      shadow_mode: shadowMode,
    };
  }
}
