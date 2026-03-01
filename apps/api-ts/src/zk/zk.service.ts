import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ZkService {
    private readonly logger = new Logger(ZkService.name);

    constructor(private readonly prisma: PrismaService) { }

    async verifyProof(userId: number, credentialType: string, proofHash: string) {
        this.logger.log(`Verifying ZK Proof for user ${userId}, type: ${credentialType}`);

        // MOCK VERIFICATION LOGIC
        // In production, this would call Sismo's Data Vault verifier or a local circom/snarkjs verifier

        // Simulate verification delay (ZK math is heavy)
        await new Promise(resolve => setTimeout(resolve, 800));

        // Simple mock validation
        if (!proofHash.startsWith('0x') || proofHash.length < 10) {
            throw new BadRequestException('Invalid cryptographic proof hash.');
        }

        // Check if credential already exists to prevent duplicate minting
        const existing = await this.prisma.zkCredential.findFirst({
            where: { userId, credentialType }
        });

        if (existing) {
            return { success: true, message: 'Proof verified (Already minted).', credential: existing };
        }

        this.logger.log(`ZKP Math Validated. Minting credential ${credentialType} for user ${userId}`);

        // Store verified credential in database
        const credential = await this.prisma.zkCredential.create({
            data: {
                userId,
                credentialType,
                proofHash,
            }
        });

        return {
            success: true,
            message: 'Zero-Knowledge Proof verified successfully.',
            credential
        };
    }

    async getUserCredentials(userId: number) {
        return this.prisma.zkCredential.findMany({
            where: { userId },
            orderBy: { verifiedAt: 'desc' }
        });
    }
}
