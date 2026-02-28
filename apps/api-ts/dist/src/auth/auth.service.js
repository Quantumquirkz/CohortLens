"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const jwt_1 = require("@nestjs/jwt");
const bcrypt = require("bcryptjs");
const prisma_service_1 = require("../prisma/prisma.service");
let AuthService = class AuthService {
    constructor(prisma, jwt, config) {
        this.prisma = prisma;
        this.jwt = jwt;
        this.config = config;
    }
    async validateUser(username, password) {
        const fallbackUser = this.config.get('DEFAULT_AUTH_USER', 'admin');
        const fallbackPassword = this.config.get('DEFAULT_USER_PASSWORD', 'admin');
        if (username === fallbackUser && password === fallbackPassword) {
            return { sub: username, tenant_id: username };
        }
        const user = await this.prisma.user.findUnique({ where: { username } });
        if (!user || !user.isActive) {
            throw new common_1.UnauthorizedException('Incorrect username or password');
        }
        const valid = await bcrypt.compare(password, user.hashedPassword);
        if (!valid) {
            throw new common_1.UnauthorizedException('Incorrect username or password');
        }
        return { sub: user.username, tenant_id: user.tenantId || user.username };
    }
    async token(username, password) {
        const payload = await this.validateUser(username, password);
        const expiresIn = Number(this.config.get('JWT_EXPIRE_SECONDS', '3600'));
        const accessToken = await this.jwt.signAsync(payload, { expiresIn });
        return {
            access_token: accessToken,
            token_type: 'bearer',
            expires_in: expiresIn,
        };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        jwt_1.JwtService,
        config_1.ConfigService])
], AuthService);
//# sourceMappingURL=auth.service.js.map