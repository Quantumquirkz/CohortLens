import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { ProfileController } from '../../src/profile/profile.controller';
import { ProfileService } from '../../src/profile/profile.service';
import { PrismaService } from '../../src/prisma/prisma.service';

describe('Profile Controller (e2e)', () => {
    let app: INestApplication;
    const mockWallet = '0x1234567890123456789012345678901234567890';

    const prismaStub = {
        user: {
            findUnique: jest.fn().mockImplementation((args) => {
                const address = args.where.walletAddress;
                if (address === mockWallet) {
                    return {
                        id: 1,
                        walletAddress: mockWallet,
                        username: 'testuser',
                        createdAt: new Date(),
                        nftLicenses: [{ tokenId: '777', tier: 'GOLD' }],
                        zkCredentials: [{ credentialType: 'HUMANITY_PROOF', verifiedAt: new Date() }],
                        defiPortfolios: [{ riskScore: 0.12, totalValueUsd: 50000 }],
                        marketBets: [],
                        loyaltyAirdrops: [],
                    };
                }
                return null;
            }),
            findFirst: jest.fn().mockImplementation((args) => {
                return {
                    id: 1,
                    walletAddress: mockWallet,
                    username: 'testuser',
                    createdAt: new Date(),
                };
            }),
        },
        nftLicense: {
            findFirst: jest.fn().mockResolvedValue({ tokenId: '777', tier: 'GOLD' }),
        },
        zkCredential: {
            findMany: jest.fn().mockResolvedValue([{ credentialType: 'HUMANITY_PROOF', verifiedAt: new Date() }]),
        },
        defiPortfolio: {
            findFirst: jest.fn().mockResolvedValue({ riskScore: 0.12, totalValueUsd: 50000 }),
        },
        marketBet: {
            count: jest.fn().mockResolvedValue(5),
            findMany: jest.fn().mockResolvedValue([]),
        },
        marketVolatility: {
            findFirst: jest.fn().mockResolvedValue({ value: 45.0 }),
        },
        $connect: jest.fn().mockResolvedValue(undefined),
        $disconnect: jest.fn().mockResolvedValue(undefined),
    };

    beforeAll(async () => {
        const moduleFixture: TestingModule = await Test.createTestingModule({
            controllers: [ProfileController],
            providers: [
                ProfileService,
                { provide: PrismaService, useValue: prismaStub },
            ],
        }).compile();

        app = moduleFixture.createNestApplication();
        await app.init();
    });

    afterAll(async () => {
        await app.close();
    });

    describe('GET /api/v2/profile/:address', () => {
        it('should return aggregated profile for a valid address', async () => {
            const response = await request(app.getHttpServer())
                .get(`/api/v2/profile/${mockWallet}`)
                .expect(200);

            expect(response.body).toHaveProperty('wallet', mockWallet);
            expect(response.body).toHaveProperty('tier', 'GOLD');
            expect(response.body.credentials).toHaveLength(1);
            expect(response.body.riskScore).toBe(0.12);
        });

        it('should return 404 for non-existent wallet', async () => {
            // We need to make sure the mock returns null for other addresses
            const response = await request(app.getHttpServer())
                .get('/api/v2/profile/0x0000000000000000000000000000000000000000')
                .expect(404);
            
            expect(response.body.message).toBe('Profile not found');
        });
    });
});
