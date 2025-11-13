import { Type } from 'class-transformer';
import {
    IsString,
    IsOptional,
    IsEnum,
    ValidateNested,
    IsArray,
} from 'class-validator';
import { StringRecordDto } from 'src/common/dto';
import {
    MCPIntegrationAuthType,
    MCPIntegrationProtocol,
} from 'src/modules/integrations/enums/integration.enum';

export class CreateIntegrationDto {
    @IsString()
    @IsOptional()
    integrationId?: string; // Only used by Kodus MCP

    @IsString()
    baseUrl: string;

    @IsEnum(MCPIntegrationProtocol)
    @IsOptional()
    protocol?: MCPIntegrationProtocol;

    @IsString()
    @IsOptional()
    name?: string;

    @IsString()
    @IsOptional()
    description?: string;

    @IsString()
    @IsOptional()
    logoUrl?: string;

    @IsArray()
    @Type(() => StringRecordDto)
    @ValidateNested({ each: true })
    @IsOptional()
    headers?: StringRecordDto[];

    @IsEnum(MCPIntegrationAuthType)
    @IsOptional()
    authType?: MCPIntegrationAuthType;

    @IsString()
    @IsOptional()
    bearerToken?: string;

    @IsString()
    @IsOptional()
    apiKey?: string;

    @IsString()
    @IsOptional()
    apiKeyHeader?: string;

    @IsString()
    @IsOptional()
    basicUser?: string;

    @IsString()
    @IsOptional()
    basicPassword?: string;

    @IsString()
    @IsOptional()
    oauthScopes?: string;

    @IsString()
    @IsOptional()
    clientId?: string;

    @IsString()
    @IsOptional()
    clientSecret?: string;
}
