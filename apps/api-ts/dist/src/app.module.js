"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const throttler_1 = require("@nestjs/throttler");
const auth_module_1 = require("./auth/auth.module");
const analytics_module_1 = require("./analytics/analytics.module");
const prisma_module_1 = require("./prisma/prisma.module");
const common_module_1 = require("./common/common.module");
const feature_flag_middleware_1 = require("./common/feature-flag.middleware");
const defi_module_1 = require("./defi/defi.module");
const zk_module_1 = require("./zk/zk.module");
const predict_module_1 = require("./predict/predict.module");
const nft_module_1 = require("./nft/nft.module");
let AppModule = class AppModule {
    configure(consumer) {
        consumer
            .apply(feature_flag_middleware_1.FeatureFlagMiddleware)
            .forRoutes('/api/v2/*');
    }
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({ isGlobal: true }),
            throttler_1.ThrottlerModule.forRoot([
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
            prisma_module_1.PrismaModule,
            auth_module_1.AuthModule,
            analytics_module_1.AnalyticsModule,
            common_module_1.CommonModule,
            defi_module_1.DefiModule,
            zk_module_1.ZkModule,
            predict_module_1.PredictModule,
            nft_module_1.NftModule,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map