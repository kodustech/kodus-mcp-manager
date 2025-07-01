import { MCPConnectionStatus } from '../../mcp/entities/mcp-connection.entity';

export interface MCPProviderConfig {
  apiKey: string;
  baseUrl: string;
  redirectUri?: string;
}

export interface MCPServerConfig {
  organizationId: string;
  appName: string;
  integrationId: string;
  connectedAccountId?: string;
  authConfigId?: string;
  allowedTools?: string[];
}

export interface MCPConnectionConfig {
  integrationId: string;
  organizationId: string;
  //redirectUri?: string;
  params?: { [key: string]: any };
}

export interface MCPServer {
  id: string;
  name: string;
  appName?: string;
  authConfigIds: string[];
  mcpUrl: string;
}

export interface MCPConnection {
  id: string;
  authId?: string;
  url?: string;
  status: string;
}

export interface MCPIntegration {
  id: string;
  name: string;
  description: string;
  authScheme: string;
  appName: string;
  provider: string;
  logo?: string;
}

export interface MCPRequiredParam {
  name: string;
  displayName: string;
  description: string;
  type: string;
  required: boolean;
}

export interface MCPInstallIntegration {
  allowedTools?: string[];
  [key: string]: any;
}

export interface MCPInstallIntegrationResponse {
  server: MCPServer;
  connection: MCPConnection;
}

export interface MCPProvider {
  statusMap: Record<string, MCPConnectionStatus>;
  getIntegrations(
    cursor?: string,
    limit?: number,
    filters?: Record<string, any>,
  ): Promise<MCPIntegration[]>;
  getIntegration(integrationId: string): Promise<MCPIntegration>;
  getIntegrationRequiredParams(
    integrationId: string,
  ): Promise<MCPRequiredParam[]>;
  getIntegrationTools(
    integrationId: string,
    organizationId: string,
  ): Promise<any[]>;
  installIntegration(
    integrationId: string,
    organizationId: string,
    data: MCPInstallIntegration,
  ): Promise<MCPInstallIntegrationResponse>;
}
