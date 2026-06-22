import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsEnum, IsString, MaxLength } from 'class-validator';
import { OrganizationRole } from '@prisma/client';

export class CreateInvitationDto {
  @ApiProperty({ example: 'member@example.com' })
  @Transform(({ value }) => normalizeEmailValue(value))
  @IsEmail()
  @MaxLength(320)
  email!: string;

  @ApiProperty({ enum: OrganizationRole })
  @IsEnum(OrganizationRole)
  role!: OrganizationRole;
}

export class AcceptInvitationDto {
  @ApiProperty()
  @IsString()
  token!: string;
}

function normalizeEmailValue(value: unknown): unknown {
  return typeof value === 'string' ? value.trim().toLowerCase() : value;
}
