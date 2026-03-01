import { Module } from '@nestjs/common';
import { DefiService } from './defi.service';
import { MarketService } from './market.service';
import { DefiController } from './defi.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
    imports: [PrismaModule, ScheduleModule.forRoot()],
    providers: [DefiService, MarketService],
    controllers: [DefiController],
    exports: [DefiService, MarketService],
})
export class DefiModule { }
