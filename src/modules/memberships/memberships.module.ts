import { Module } from '@nestjs/common';
import { CommonAuthorizationModule } from '../../common/common-authorization.module';
import { MembershipsController } from './memberships.controller';
import { MembershipsService } from './memberships.service';

@Module({
  imports: [CommonAuthorizationModule],
  controllers: [MembershipsController],
  providers: [MembershipsService],
})
export class MembershipsModule {}
