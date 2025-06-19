import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class InitiateConnectionDto {
  @IsString()
  @IsNotEmpty()
  integrationId: string;

  @IsString()
  @IsNotEmpty()
  organizationId: string;

  @IsString()
  @IsOptional()
  apiKey?: string;
}
