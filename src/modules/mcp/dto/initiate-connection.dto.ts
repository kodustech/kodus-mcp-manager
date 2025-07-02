import {
  IsArray,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';

export class InitiateConnectionDto {
  @IsString()
  @IsNotEmpty()
  integrationId: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  allowedTools?: string[];

  @IsObject()
  @IsOptional()
  authParams?: Record<string, any>;
}
