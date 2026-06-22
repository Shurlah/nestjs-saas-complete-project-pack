import { Body, Controller, Post, Req } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.type';
import type { ResponsePayload } from '../../common/interceptors/response.interceptor';
import { AuthService } from './auth.service';
import {
  ForgotPasswordDto,
  LoginDto,
  LogoutDto,
  RefreshTokenDto,
  RegisterDto,
  ResetPasswordDto,
  VerifyEmailDto,
} from './dto/auth.dto';

@ApiTags('authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register a user account' })
  @ApiCreatedResponse({ description: 'Account registered.' })
  async register(
    @Body() dto: RegisterDto,
    @Req() request: Request,
  ): Promise<ResponsePayload<unknown>> {
    return {
      message: 'Account registered',
      data: await this.authService.register(dto, requestContext(request)),
    };
  }

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Sign in and create a client session' })
  @ApiOkResponse({ description: 'Signed in.' })
  async login(
    @Body() dto: LoginDto,
    @Req() request: Request,
  ): Promise<ResponsePayload<unknown>> {
    return {
      message: 'Signed in',
      data: await this.authService.login(dto, requestContext(request)),
    };
  }

  @Public()
  @Post('refresh')
  @ApiOperation({ summary: 'Rotate a refresh token' })
  async refresh(
    @Body() dto: RefreshTokenDto,
    @Req() request: Request,
  ): Promise<ResponsePayload<unknown>> {
    return {
      message: 'Tokens refreshed',
      data: await this.authService.refresh(
        dto.refreshToken,
        requestContext(request),
      ),
    };
  }

  @Post('logout')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Revoke the current session or every user session' })
  async logout(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: LogoutDto,
    @Req() request: Request,
  ): Promise<ResponsePayload<null>> {
    await this.authService.logout(
      user.id,
      user.sessionId,
      dto.allDevices,
      requestContext(request),
    );
    return { message: 'Signed out', data: null };
  }

  @Public()
  @Post('forgot-password')
  @ApiOperation({
    summary: 'Request a password reset without revealing account existence',
  })
  async forgotPassword(
    @Body() dto: ForgotPasswordDto,
    @Req() request: Request,
  ): Promise<ResponsePayload<null>> {
    await this.authService.forgotPassword(dto, requestContext(request));
    return {
      message: 'If the account exists, reset instructions have been queued',
      data: null,
    };
  }

  @Public()
  @Post('reset-password')
  @ApiOperation({ summary: 'Reset a password using a one-time token' })
  async resetPassword(
    @Body() dto: ResetPasswordDto,
    @Req() request: Request,
  ): Promise<ResponsePayload<null>> {
    await this.authService.resetPassword(dto, requestContext(request));
    return { message: 'Password reset completed', data: null };
  }

  @Public()
  @Post('verify-email')
  @ApiOperation({ summary: 'Verify an email address using a one-time token' })
  async verifyEmail(
    @Body() dto: VerifyEmailDto,
    @Req() request: Request,
  ): Promise<ResponsePayload<null>> {
    await this.authService.verifyEmail(dto, requestContext(request));
    return { message: 'Email verified', data: null };
  }
}

function requestContext(request: Request) {
  const forwardedFor = request.headers['x-forwarded-for'];
  return {
    ipAddress:
      typeof forwardedFor === 'string'
        ? forwardedFor.split(',')[0].trim()
        : request.ip,
    userAgent: request.get('user-agent')?.slice(0, 1000),
  };
}
