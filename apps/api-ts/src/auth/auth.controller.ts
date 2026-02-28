import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

@ApiTags('auth')
@UseGuards(ThrottlerGuard)
@Controller('/api/v2/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Throttle({ auth: { ttl: 60000, limit: 10 } })
  @Post('/token')
  createToken(@Body() body: LoginDto) {
    return this.authService.token(body.username, body.password);
  }
}
