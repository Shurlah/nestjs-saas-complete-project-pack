import { Module } from '@nestjs/common';
import { CommonAuthorizationModule } from '../../common/common-authorization.module';
import { AuthModule } from '../auth/auth.module';
import {
  InvitationAcceptanceController,
  InvitationsController,
} from './invitations.controller';
import { InvitationsService } from './invitations.service';

@Module({
  imports: [AuthModule, CommonAuthorizationModule],
  controllers: [InvitationsController, InvitationAcceptanceController],
  providers: [InvitationsService],
})
export class InvitationsModule {}
