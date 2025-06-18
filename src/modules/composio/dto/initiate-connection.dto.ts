import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class InitiateConnectionDto {
  @IsString()
  @IsNotEmpty()
  integrationId: string;

  @IsString()
  @IsNotEmpty()
  entityId: string;

  @IsString()
  @IsOptional()
  apiKey?: string;
}
