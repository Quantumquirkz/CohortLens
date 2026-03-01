import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { Web3VerifyDto } from './dto/web3-verify.dto';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    createToken(body: LoginDto): Promise<{
        access_token: string;
        token_type: "bearer";
        expires_in: number;
    }>;
    getNonce(address: string): Promise<string>;
    verifyWeb3Signature(body: Web3VerifyDto): Promise<{
        access_token: string;
        token_type: "bearer";
        expires_in: number;
        wallet_address: string | null;
    }>;
}
