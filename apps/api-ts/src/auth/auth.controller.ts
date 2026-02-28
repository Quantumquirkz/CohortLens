import { Body, Controller, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

@ApiTags('auth')
@Controller('/api/v2/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('/token')
  createToken(@Body() body: LoginDto) {
    return this.authService.token(body.username, body.password);
  }
}
