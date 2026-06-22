import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { OrganizationRole } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { OrganizationMemberGuard } from '../../common/guards/organization-member.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import type { ResponsePayload } from '../../common/interceptors/response.interceptor';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.type';
import { ChangeMemberRoleDto } from './dto/memberships.dto';
import { MembershipsService } from './memberships.service';

@ApiTags('memberships')
@ApiBearerAuth()
@Controller('organizations/:organizationId/members')
@UseGuards(OrganizationMemberGuard, RolesGuard)
export class MembershipsController {
  constructor(private readonly memberships: MembershipsService) {}

  @Get()
  @Roles(
    OrganizationRole.OWNER,
    OrganizationRole.ADMIN,
    OrganizationRole.PROJECT_MANAGER,
    OrganizationRole.MEMBER,
  )
  @ApiOperation({ summary: 'List active organization members' })
  async list(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
  ): Promise<ResponsePayload<unknown>> {
    return {
      message: 'Members retrieved',
      data: await this.memberships.list(organizationId),
    };
  }

  @Patch(':membershipId/role')
  @Roles(OrganizationRole.OWNER, OrganizationRole.ADMIN)
  @ApiOperation({ summary: 'Change a non-owner member role' })
  async changeRole(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('membershipId', ParseUUIDPipe) membershipId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: ChangeMemberRoleDto,
  ): Promise<ResponsePayload<unknown>> {
    return {
      message: 'Member role updated',
      data: await this.memberships.changeRole(
        organizationId,
        membershipId,
        user.id,
        dto.role,
      ),
    };
  }

  @Delete(':membershipId')
  @Roles(OrganizationRole.OWNER, OrganizationRole.ADMIN)
  @ApiOperation({ summary: 'Remove a non-owner organization member' })
  async remove(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('membershipId', ParseUUIDPipe) membershipId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ResponsePayload<null>> {
    await this.memberships.remove(organizationId, membershipId, user.id);
    return { message: 'Member removed', data: null };
  }
}
