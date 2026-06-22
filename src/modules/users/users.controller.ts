import { Body, Controller, Get, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.type';
import type { ResponsePayload } from '../../common/interceptors/response.interceptor';
import { ChangePasswordDto, UpdateProfileDto } from './dto/users.dto';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get the current user profile' })
  async getCurrent(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ResponsePayload<unknown>> {
    return {
      message: 'Profile retrieved',
      data: await this.usersService.getCurrent(user.id),
    };
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update the current user profile' })
  async updateCurrent(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateProfileDto,
  ): Promise<ResponsePayload<unknown>> {
    return {
      message: 'Profile updated',
      data: await this.usersService.updateCurrent(user.id, dto),
    };
  }

  @Patch('me/password')
  @ApiOperation({
    summary: 'Change the current password and revoke all sessions',
  })
  async changePassword(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ChangePasswordDto,
  ): Promise<ResponsePayload<null>> {
    await this.usersService.changePassword(user.id, dto);
    return {
      message: 'Password changed; all sessions were revoked',
      data: null,
    };
  }
}
