import {
  Composio,
  OpenAIToolSet,
  SingleConnectedAccountResponse,
} from 'composio-core';
import axios, { AxiosInstance } from 'axios';
import {
  MCPConnection,
  MCPConnectionConfig,
  MCPIntegration,
  MCPProviderConfig,
  MCPServer,
  MCPServerConfig,
  MCPRequiredParam,
  MCPInstallIntegration,
  MCPInstallIntegrationResponse,
} from './interfaces/provider.interface';
import { BaseProvider } from './base.provider';
import { ConfigService } from '@nestjs/config';
import { MCPConnectionStatus } from '../mcp/entities/mcp-connection.entity';
import { BadRequestException } from '@nestjs/common';

export class ComposioProvider extends BaseProvider {
  private readonly composio: Composio;
  private readonly toolset: OpenAIToolSet;
  private readonly client: AxiosInstance;
  private readonly config: MCPProviderConfig;

  public readonly statusMap = {
    INITIALIZING: MCPConnectionStatus.PENDING,
    INITIATED: MCPConnectionStatus.PENDING,
    ACTIVE: MCPConnectionStatus.ACTIVE,
    FAILED: MCPConnectionStatus.FAILED,
    EXPIRED: MCPConnectionStatus.EXPIRED,
    INACTIVE: MCPConnectionStatus.INACTIVE,

    // oauth2 statuses
    success: MCPConnectionStatus.ACTIVE,
    error: MCPConnectionStatus.FAILED,
  };

  constructor(configService: ConfigService) {
    super();

    this.config = {
      apiKey: configService.get(`composio.apiKey`),
      baseUrl: configService.get(`composio.baseUrl`),
      redirectUri: configService.get('redirectUri'),
    };

    this.composio = new Composio({
      apiKey: this.config.apiKey,
      baseUrl: 'https://backend.composio.dev',
    });
    this.toolset = new OpenAIToolSet({
      apiKey: this.config.apiKey,
      baseUrl: 'https://backend.composio.dev',
    });
    this.client = axios.create({
      baseURL: this.config.baseUrl,
      headers: {
        'x-api-key': this.config.apiKey,
        'Content-Type': 'application/json',
      },
    });
  }

  private getMCPUrl(serverId: string, authConfigId: string): string {
    return `https://mcp.composio.dev/composio/server/${serverId}/mcp?connected_account_id=${authConfigId}`;
  }

  private validateConfig(
    config: MCPServerConfig | MCPConnectionConfig | MCPInstallIntegration,
  ): void {
    Object.entries(config).forEach(([key, value]) => {
      if (
        value === undefined &&
        key !== 'allowedTools' &&
        key !== 'apiKey' &&
        key !== 'token'
      ) {
        throw new BadRequestException(`${key} is required`);
      }
    });
  }

  private validateRequiredParams(
    requiredParams: MCPRequiredParam[],
    params: MCPInstallIntegration,
  ): void {
    requiredParams.forEach((param) => {
      if (
        params[param.name] === undefined &&
        param.required &&
        param.type === 'string'
      ) {
        throw new BadRequestException(
          `Required parameter "${param.name}" is required`,
        );
      }
    });
  }

  async getIntegrations(
    page = 1,
    pageSize = 50,
    filters?: Record<string, any>,
  ): Promise<MCPIntegration[]> {
    const result: any = await this.composio.integrations.list({
      page,
      pageSize,
      appName: filters?.appName,
    });

    return result.items.map((integration: any) => ({
      id: integration.id,
      name: integration.name,
      description: integration.description,
      authScheme: integration.authScheme,
      appName: integration.appName,
      logo: integration.logo,
      provider: 'composio',
    }));
  }

  async getIntegration(integrationId: string): Promise<MCPIntegration> {
    this.validateId(integrationId, 'Integration');
    const integration: any = await this.composio.integrations.get({
      integrationId,
    });
    return {
      id: integration.id,
      name: integration.name,
      description: integration.description,
      authScheme: integration.authScheme,
      appName: integration.appName,
      logo: integration.logo,
      provider: 'composio',
    };
  }

  async getIntegrationRequiredParams(
    integrationId: string,
  ): Promise<MCPRequiredParam[]> {
    this.validateId(integrationId, 'Integration');
    const params = await this.composio.integrations.getRequiredParams({
      integrationId,
    });
    return params.map((param) => ({
      name: param.name,
      description: param.description,
      type: param.type,
      required: param.required,
    }));
  }

  async getIntegrationTools(integrationId: string): Promise<any[]> {
    this.validateId(integrationId, 'Integration');
    return this.toolset.getTools({ integrationId });
  }

  async initiateConnection(
    config: MCPConnectionConfig,
  ): Promise<MCPConnection> {
    this.validateConfig(config);

    const requiredParams = await this.getIntegrationRequiredParams(
      config.integrationId,
    );

    if (requiredParams.length > 0) {
      this.validateRequiredParams(requiredParams, config.params);
    }
    const { integrationId, organizationId } = config;

    const redirectUri = this.buildRedirectUri(this.config.redirectUri, {
      provider: 'composio',
      integrationId,
    });

    const params: any = {
      integrationId,
      redirectUri,
    };

    const integration = await this.getIntegration(integrationId);

    if (!integration.authScheme.includes('OAUTH')) {
      params.connectionParams = {
        ...config.params,
      };
    }

    params.appName = integration.appName;
    // params.authMode = integration.authScheme;

    const entity = await this.toolset.getEntity(organizationId);
    const connectionRequest = await entity.initiateConnection(params);

    return {
      id: connectionRequest.connectedAccountId,
      url: connectionRequest.redirectUrl || '',
      status: this.statusMap[connectionRequest.connectionStatus],
    };
  }

  async getConnections(
    page = 1,
    pageSize = 10,
    filters?: Record<string, any>,
  ): Promise<{ data: MCPConnection[]; total: number }> {
    const result: any = await this.composio.connectedAccounts.list({
      page,
      pageSize,
      integrationId: filters?.integrationId,
      entityId: filters?.organizationId,
    });

    return {
      data: result.data.map((connection) => ({
        id: connection.id,
        status: connection.status,
      })),
      total: result.total,
    };
  }

  async getConnection(
    connectedAccountId: string,
  ): Promise<SingleConnectedAccountResponse> {
    return this.composio.connectedAccounts.get({
      connectedAccountId,
    });
  }

  async createMCPServer(config: MCPServerConfig): Promise<MCPServer> {
    this.validateConfig(config);
    const { organizationId, appName, authConfigId, allowedTools } = config;

    const name = `${appName}-${organizationId.trim()}`
      .replace(/ /g, '-')
      .substring(0, 25);
    const { data } = await this.client.post('/mcp/servers', {
      name,
      auth_config_ids: [authConfigId],
      allowed_tools: allowedTools?.length ? allowedTools : undefined,
    });

    return {
      id: data.id,
      name: data.name,
      authConfigIds: data.auth_config_ids,
      mcpUrl: this.getMCPUrl(data.id, authConfigId),
    };
  }

  async getMCPServer(authConfigId: string): Promise<{ items: MCPServer[] }> {
    this.validateId(authConfigId, 'Auth Config');
    const { data } = await this.client.get('/mcp/servers', {
      params: { auth_config_ids: authConfigId },
    });

    const items = data.items.map((server: any) => ({
      id: server.id,
      name: server.name,
      auth_config_ids: server.auth_config_ids,
      mcp_url: this.getMCPUrl(server.id, server.auth_config_ids[0]),
    }));

    return { items };
  }

  async installIntegration(
    integrationId: string,
    organizationId: string,
    data: MCPInstallIntegration,
  ): Promise<MCPInstallIntegrationResponse> {
    this.validateConfig(data);

    const { allowedTools, ...rest } = data;
    const initiateConnection = await this.initiateConnection({
      integrationId,
      organizationId: organizationId,
      params: { ...rest },
    });

    const connection: any = await this.getConnection(initiateConnection.id);

    const server = await this.createMCPServer({
      organizationId,
      appName: connection.appName,
      authConfigId: connection.authConfig.id,
      allowedTools: allowedTools,
    });

    return {
      server: {
        ...server,
        appName: connection.appName,
      },
      connection: {
        id: connection.id,
        authId: connection.authConfig.id,
        status: this.statusMap[connection.status],
        url: initiateConnection.url,
      },
    };
  }
}
