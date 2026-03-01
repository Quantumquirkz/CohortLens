import { UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export abstract class BaseController {
    constructor(protected readonly prisma: PrismaService) { }

    protected async getUserIdFromRequest(req: any): Promise<number> {
        const identifier = req.user.sub; // This could be walletAddress or username

        const user = await this.prisma.user.findFirst({
            where: {
                OR: [
                    { walletAddress: identifier },
                    { username: identifier }
                ]
            }
        });

        if (!user) {
            throw new UnauthorizedException('User not found in database');
        }

        return user.id;
    }
}
