import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
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
  CreateOrganizationDto,
  UpdateOrganizationDto,
} from './dto/organizations.dto';
import { OrganizationsService } from './organizations.service';

@ApiTags('organizations')
@ApiBearerAuth()
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly organizations: OrganizationsService) {}

  @Post()
  @ApiOperation({ summary: 'Create an organization and become its owner' })
  async create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateOrganizationDto,
  ): Promise<ResponsePayload<unknown>> {
    return {
      message: 'Organization created',
      data: await this.organizations.create(user.id, dto),
    };
  }

  @Get()
  @ApiOperation({ summary: 'List organizations for the current user' })
  async list(
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ResponsePayload<unknown>> {
    return {
      message: 'Organizations retrieved',
      data: await this.organizations.listForUser(user.id),
    };
  }

  @Get(':organizationId')
  @UseGuards(OrganizationMemberGuard)
  @ApiOperation({ summary: 'Get an organization as an active member' })
  async get(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
  ): Promise<ResponsePayload<unknown>> {
    return {
      message: 'Organization retrieved',
      data: await this.organizations.get(organizationId),
    };
  }

  @Patch(':organizationId')
  @UseGuards(OrganizationMemberGuard, RolesGuard)
  @Roles(OrganizationRole.OWNER, OrganizationRole.ADMIN)
  @ApiOperation({ summary: 'Update an organization' })
  async update(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateOrganizationDto,
  ): Promise<ResponsePayload<unknown>> {
    return {
      message: 'Organization updated',
      data: await this.organizations.update(organizationId, user.id, dto),
    };
  }

  @Delete(':organizationId')
  @UseGuards(OrganizationMemberGuard, RolesGuard)
  @Roles(OrganizationRole.OWNER)
  @ApiOperation({ summary: 'Archive an organization' })
  async archive(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ResponsePayload<null>> {
    await this.organizations.archive(organizationId, user.id);
    return { message: 'Organization archived', data: null };
  }
}
