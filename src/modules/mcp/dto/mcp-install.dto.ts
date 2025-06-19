import { IsArray, IsOptional, IsString } from 'class-validator';

export class MCPInstallIntegrationDto {
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  allowedTools?: string[];
}
