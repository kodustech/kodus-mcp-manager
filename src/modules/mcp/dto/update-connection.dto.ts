import { IsNotEmpty, IsObject, IsOptional, IsString, IsArray } from 'class-validator';

export class UpdateConnectionDto {
  @IsString()
  @IsNotEmpty()
  integrationId: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class UpdateAllowedToolsDto {
  @IsArray()
  @IsString({ each: true })
  allowedTools: string[];
}
