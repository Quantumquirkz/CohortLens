import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
export declare class AuthService {
    private readonly prisma;
    private readonly jwt;
    private readonly config;
    constructor(prisma: PrismaService, jwt: JwtService, config: ConfigService);
    validateUser(username: string, password: string): Promise<{
        sub: string;
        tenant_id: string;
    }>;
    token(username: string, password: string): Promise<{
        access_token: string;
        token_type: "bearer";
        expires_in: number;
    }>;
}
