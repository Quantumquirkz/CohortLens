import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { FeatureFlagService } from './feature-flag.service';

/**
 * Middleware for v2 API endpoints
 * Handles:
 * - Feature flag validation (V2_ENABLED killswitch)
 * - Request/response logging for shadow mode validation
 * - Performance metrics collection
 */
@Injectable()
export class FeatureFlagMiddleware implements NestMiddleware {
  constructor(private readonly featureFlags: FeatureFlagService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now();
    
    // Skip feature flag check for admin endpoints
    if (req.path.startsWith('/api/v2/admin')) {
      return next();
    }

    // Check if v2 is enabled (killswitch)
    if (!this.featureFlags.isEnabled('V2_ENABLED')) {
      return res.status(503).json({
        statusCode: 503,
        message: 'v2 API is temporarily unavailable',
        migrationStatus: this.featureFlags.getMigrationStatus(),
      });
    }

    // Intercept response to log metrics
    const originalJson = res.json.bind(res);
    res.json = (body: any) => {
      const responseTime = Date.now() - startTime;
      
      // Log v2 usage for migration monitoring
      if (this.featureFlags.isEnabled('MIGRATION_LOGGING')) {
        console.log(`[V2_ENDPOINT] ${req.method} ${req.path} ${res.statusCode} ${responseTime}ms`);
      }

      // Attach monitoring info to response headers
      res.set('X-V2-Response-Time', `${responseTime}ms`);
      res.set('X-Migration-Status', this.featureFlags.getMigrationStatus().phase);

      return originalJson(body);
    };

    next();
  }
}

/**
 * Example: Using middleware in AppModule
 * 
 * import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
 * 
 * @Module({...})
 * export class AppModule implements NestModule {
 *   configure(consumer: MiddlewareConsumer) {
 *     consumer
 *       .apply(FeatureFlagMiddleware)
 *       .forRoutes('/api/v2/*');
 *   }
 * }
 */
