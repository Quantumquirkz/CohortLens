import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { generateNonce, SiweMessage } from 'siwe';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) { }

  async validateUser(username: string, password: string): Promise<{ sub: string; tenant_id: string }> {
    const fallbackUser = this.config.get<string>('DEFAULT_AUTH_USER', 'admin');
    const fallbackPassword = this.config.get<string>('DEFAULT_USER_PASSWORD', 'admin');

    if (username === fallbackUser && password === fallbackPassword) {
      return { sub: username, tenant_id: username };
    }

    const user = await this.prisma.user.findUnique({ where: { username } });
    if (!user || !user.isActive || !user.hashedPassword) {
      throw new UnauthorizedException('Incorrect username or password');
    }

    const valid = await bcrypt.compare(password, user.hashedPassword);
    if (!valid) {
      throw new UnauthorizedException('Incorrect username or password');
    }

    // username is guaranteed here because we searched by it, but TS doesn't know
    const finalUsername = user.username!;
    return { sub: finalUsername, tenant_id: user.tenantId || finalUsername };
  }

  async token(username: string, password: string) {
    const payload = await this.validateUser(username, password);
    const expiresIn = Number(this.config.get<string>('JWT_EXPIRE_SECONDS', '3600'));
    const accessToken = await this.jwt.signAsync(payload, { expiresIn });

    return {
      access_token: accessToken,
      token_type: 'bearer' as const,
      expires_in: expiresIn,
    };
  }

  async getNonce(walletAddress: string): Promise<string> {
    const nonce = generateNonce();

    // Upsert user with wallet address
    await this.prisma.user.upsert({
      where: { walletAddress },
      update: { nonce },
      create: {
        walletAddress,
        nonce,
        isActive: true,
      },
    });

    return nonce;
  }

  async verifyWeb3Signature(message: string, signature: string) {
    const siweMessage = new SiweMessage(message);
    const { data: fields } = await siweMessage.verify({ signature });

    const user = await this.prisma.user.findUnique({
      where: { walletAddress: fields.address },
    });

    if (!user || user.nonce !== fields.nonce) {
      throw new UnauthorizedException('Invalid nonce or user not found');
    }

    // Reset nonce to prevent replay attacks
    await this.prisma.user.update({
      where: { id: user.id },
      data: { nonce: null, lastLogin: new Date() },
    });

    const expiresIn = Number(this.config.get<string>('JWT_EXPIRE_SECONDS', '3600'));
    // We'll use the wallet address as the subject since Web3 users might not have a username
    const sub = user.username || user.walletAddress;
    const tenant_id = user.tenantId || user.walletAddress;

    const accessToken = await this.jwt.signAsync({ sub, tenant_id }, { expiresIn });

    return {
      access_token: accessToken,
      token_type: 'bearer' as const,
      expires_in: expiresIn,
      wallet_address: user.walletAddress,
    };
  }
}
