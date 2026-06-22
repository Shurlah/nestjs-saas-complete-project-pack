import { ApiProperty } from '@nestjs/swagger';
import { OrganizationRole } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class ChangeMemberRoleDto {
  @ApiProperty({ enum: OrganizationRole })
  @IsEnum(OrganizationRole)
  role!: OrganizationRole;
}
