import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
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
import {
  AcceptInvitationDto,
  CreateInvitationDto,
} from './dto/invitations.dto';
import { InvitationsService } from './invitations.service';

@ApiTags('invitations')
@ApiBearerAuth()
@Controller('organizations/:organizationId/invitations')
@UseGuards(OrganizationMemberGuard, RolesGuard)
@Roles(OrganizationRole.OWNER, OrganizationRole.ADMIN)
export class InvitationsController {
  constructor(private readonly invitations: InvitationsService) {}

  @Post()
  @ApiOperation({ summary: 'Invite a user to an organization' })
  async create(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateInvitationDto,
  ): Promise<ResponsePayload<unknown>> {
    return {
      message: 'Invitation created',
      data: await this.invitations.create(organizationId, user.id, dto),
    };
  }

  @Get()
  @ApiOperation({ summary: 'List organization invitations' })
  async list(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
  ): Promise<ResponsePayload<unknown>> {
    return {
      message: 'Invitations retrieved',
      data: await this.invitations.list(organizationId),
    };
  }

  @Delete(':invitationId')
  @ApiOperation({ summary: 'Cancel a pending invitation' })
  async cancel(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('invitationId', ParseUUIDPipe) invitationId: string,
  ): Promise<ResponsePayload<null>> {
    await this.invitations.cancel(organizationId, invitationId);
    return { message: 'Invitation cancelled', data: null };
  }
}

@ApiTags('invitations')
@ApiBearerAuth()
@Controller('invitations')
export class InvitationAcceptanceController {
  constructor(private readonly invitations: InvitationsService) {}

  @Post('accept')
  @ApiOperation({ summary: 'Accept an invitation for the current account' })
  async accept(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: AcceptInvitationDto,
  ): Promise<ResponsePayload<unknown>> {
    return {
      message: 'Invitation accepted',
      data: await this.invitations.accept(user.id, user.email, dto.token),
    };
  }
}
