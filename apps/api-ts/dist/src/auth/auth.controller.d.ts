import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    createToken(body: LoginDto): Promise<{
        access_token: string;
        token_type: "bearer";
        expires_in: number;
    }>;
}
