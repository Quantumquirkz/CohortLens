import { Body, Controller, Post, Get, Query, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { Web3VerifyDto } from './dto/web3-verify.dto';

@ApiTags('auth')
@UseGuards(ThrottlerGuard)
@Controller('/api/v2/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  @Throttle({ auth: { ttl: 60000, limit: 10 } })
  @Post('/token')
  createToken(@Body() body: LoginDto) {
    return this.authService.token(body.username, body.password);
  }

  @ApiOperation({ summary: 'Get a nonce for Web3 SIWE login' })
  @Get('/nonce')
  getNonce(@Query('address') address: string) {
    return this.authService.getNonce(address);
  }

  @ApiOperation({ summary: 'Verify Web3 SIWE signature and get JWT token' })
  @Post('/verify')
  verifyWeb3Signature(@Body() body: Web3VerifyDto) {
    return this.authService.verifyWeb3Signature(body.message, body.signature);
  }
}
