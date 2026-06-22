import { Module } from '@nestjs/common';
import { CommonAuthorizationModule } from '../../common/common-authorization.module';
import { OrganizationsController } from './organizations.controller';
import { OrganizationsService } from './organizations.service';

@Module({
  imports: [CommonAuthorizationModule],
  controllers: [OrganizationsController],
  providers: [OrganizationsService],
})
export class OrganizationsModule {}
