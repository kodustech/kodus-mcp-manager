import { IsString, IsOptional } from 'class-validator';

export class CreateIntegrationDto {
  @IsString()
  @IsOptional()
  integrationId?: string;

  @IsString()
  @IsOptional()
  mcpUrl?: string;
}
