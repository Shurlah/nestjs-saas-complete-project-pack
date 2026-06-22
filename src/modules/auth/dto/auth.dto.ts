import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  Matches,
} from 'class-validator';

const passwordRules = {
  pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).+$/,
  message:
    'password must include uppercase, lowercase, number, and special character',
};

export class RegisterDto {
  @ApiProperty({ example: 'person@example.com' })
  @Transform(({ value }) => normalizeEmailValue(value))
  @IsEmail()
  @MaxLength(320)
  email!: string;

  @ApiProperty({ minLength: 1, maxLength: 100 })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  firstName!: string;

  @ApiProperty({ minLength: 1, maxLength: 100 })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  lastName!: string;

  @ApiProperty({ minLength: 8, format: 'password' })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  @Matches(passwordRules.pattern, { message: passwordRules.message })
  password!: string;
}

export class LoginDto {
  @ApiProperty({ example: 'person@example.com' })
  @Transform(({ value }) => normalizeEmailValue(value))
  @IsEmail()
  email!: string;

  @ApiProperty({ format: 'password' })
  @IsString()
  password!: string;
}

export class RefreshTokenDto {
  @ApiProperty()
  @IsString()
  refreshToken!: string;
}

export class LogoutDto {
  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  allDevices = false;
}

export class ForgotPasswordDto {
  @ApiProperty({ example: 'person@example.com' })
  @Transform(({ value }) => normalizeEmailValue(value))
  @IsEmail()
  email!: string;
}

export class ResetPasswordDto {
  @ApiProperty()
  @IsString()
  token!: string;

  @ApiProperty({ minLength: 8, format: 'password' })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  @Matches(passwordRules.pattern, { message: passwordRules.message })
  newPassword!: string;
}

export class VerifyEmailDto {
  @ApiProperty()
  @IsString()
  token!: string;
}

function normalizeEmailValue(value: unknown): unknown {
  return typeof value === 'string' ? value.trim().toLowerCase() : value;
}
