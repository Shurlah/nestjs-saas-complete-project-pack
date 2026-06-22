import { Module } from '@nestjs/common';
import { OrganizationMemberGuard } from './guards/organization-member.guard';
import { ProjectAccessGuard } from './guards/project-access.guard';
import { RolesGuard } from './guards/roles.guard';

@Module({
  providers: [OrganizationMemberGuard, RolesGuard, ProjectAccessGuard],
  exports: [OrganizationMemberGuard, RolesGuard, ProjectAccessGuard],
})
export class CommonAuthorizationModule {}
