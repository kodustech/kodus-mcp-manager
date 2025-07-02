import { IsNotEmpty, IsObject, IsOptional, IsString } from 'class-validator';

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
