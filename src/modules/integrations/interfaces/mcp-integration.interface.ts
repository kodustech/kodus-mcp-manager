import { MCPIntegrationEntity } from '../entities/mcp-integration.entity';
import { MCPIntegrationAuthType } from '../enums/integration.enum';

export type MCPIntegrationInterface =
    | MCPIntegrationNone
    | MCPIntegrationBearerToken
    | MCPIntegrationApiKey
    | MCPIntegrationBasic
    | MCPIntegrationOAuth2;

interface MCPIntegrationBase
    extends Omit<MCPIntegrationEntity, 'authType' | 'auth' | 'headers'> {
    headers?: Record<string, string>;
}

interface MCPIntegrationNone extends MCPIntegrationBase {
    authType: MCPIntegrationAuthType.NONE;
}

interface MCPIntegrationBearerToken extends MCPIntegrationBase {
    authType: MCPIntegrationAuthType.BEARER_TOKEN;
    bearerToken: string;
}

interface MCPIntegrationApiKey extends MCPIntegrationBase {
    authType: MCPIntegrationAuthType.API_KEY;
    apiKey: string;
    apiKeyHeader: string;
}

interface MCPIntegrationBasic extends MCPIntegrationBase {
    authType: MCPIntegrationAuthType.BASIC;
    basicUser: string;
    basicPassword?: string;
}

interface MCPIntegrationOAuth2 extends MCPIntegrationBase {
    authType: MCPIntegrationAuthType.OAUTH2;
    clientId: string;
    clientSecret?: string;
    scopes?: string[];
    accessToken?: string;
    refreshToken?: string;
    tokenExpiry?: number;
}
