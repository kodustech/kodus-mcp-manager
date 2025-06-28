import {
  AuthScheme,
  Composio,
  ConnectedAccountRetrieveResponse,
} from '@composio/core';
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
} from '../interfaces/provider.interface';
import { BaseProvider } from '../base.provider';
import { ConfigService } from '@nestjs/config';
import { MCPConnectionStatus } from '../../mcp/entities/mcp-connection.entity';
import { BadRequestException } from '@nestjs/common';

export class ComposioProvider extends BaseProvider {
  private readonly composio: Composio;
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

  public readonly authSchemaMap = {
    OAUTH2: AuthScheme.OAuth2,
    OAUTH1: AuthScheme.OAuth1,
    API_KEY: AuthScheme.APIKey,
    BASIC: AuthScheme.Basic,
    BEARER_TOKEN: AuthScheme.BearerToken,
    GOOGLE_SERVICE_ACCOUNT: AuthScheme.GoogleServiceAccount,
    NO_AUTH: AuthScheme.NoAuth,
    BASIC_WITH_JWT: AuthScheme.BasicWithJWT,
    COMPOSIO_LINK: AuthScheme.ComposioLink,
    CALCOM_AUTH: AuthScheme.CalcomAuth,
  };

  constructor(configService: ConfigService) {
    super();

    this.config = {
      apiKey: configService.get(`composio.apiKey`),
      baseUrl: configService.get(`composio.baseUrl`),
      redirectUri: configService.get('redirectUri'),
    };

    console.log(this.config);

    this.composio = new Composio({
      apiKey: this.config.apiKey,
      baseURL: 'https://backend.composio.dev',
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
    cursor: string = '',
    limit = 50,
    filters?: Record<string, any>,
  ): Promise<MCPIntegration[]> {
    const result = await this.composio.authConfigs.list({
      limit,
      cursor,
      toolkit: filters?.toolkit,
    });

    return result.items.map((integration) => ({
      id: integration.id,
      name: integration.name,
      description: '',
      authScheme: integration.authScheme,
      appName: integration.toolkit.slug,
      logo: integration.toolkit.logo,
      provider: 'composio',
    }));
  }

  async getIntegration(integrationId: string): Promise<MCPIntegration> {
    this.validateId(integrationId, 'Integration');
    const integration = await this.composio.authConfigs.get(integrationId);
    return {
      id: integration.id,
      name: integration.name,
      description: '',
      authScheme: integration.authScheme,
      appName: integration.toolkit.slug,
      logo: integration.toolkit.logo,
      provider: 'composio',
    };
  }

  async getIntegrationRequiredParams(
    integrationId: string,
  ): Promise<MCPRequiredParam[]> {
    this.validateId(integrationId, 'Integration');
    const integration = await this.composio.authConfigs.get(integrationId);
    return integration.expectedInputFields.map((param: any) => ({
      name: param.name,
      displayName: param.displayName,
      description: param.description,
      type: param.type,
      required: param.required,
    }));
  }

  async getIntegrationTools(
    integrationId: string,
    organizationId: string,
  ): Promise<any[]> {
    this.validateId(integrationId, 'Integration');
    const integration = await this.composio.authConfigs.get(integrationId);

    const restrictTools = integration.restrictToFollowingTools || [];
    let tools = [];
    if (restrictTools.length) {
      tools = await this.composio.tools.get(organizationId, {
        toolkits: [integration.toolkit.slug],
        limit: restrictTools.length + 1,
      });
    } else {
      tools = await this.composio.tools.get(organizationId, {
        tools: restrictTools,
      });
    }

    return tools.map((tool) => ({
      type: tool.type,
      name: tool[tool.type].name,
      description: tool[tool.type].description,
      provider: 'composio',
    }));
  }

  async initiateConnection(
    config: MCPConnectionConfig,
  ): Promise<MCPConnection> {
    this.validateConfig(config);

    const requiredParams = await this.getIntegrationRequiredParams(
      config.integrationId,
    );

    if (requiredParams.length > 0)
      this.validateRequiredParams(requiredParams, config.params);

    const { integrationId, organizationId } = config;

    const redirectUrl = this.buildRedirectUri(this.config.redirectUri, {
      provider: 'composio',
      integrationId,
    });

    const integration = await this.getIntegration(integrationId);

    const schema = this.authSchemaMap[integration.authScheme]({
      ...config.params,
      redirectUrl,
    });

    const connectionRequest = await this.composio.connectedAccounts.initiate(
      organizationId,
      integration.id,
      { config: schema },
    );

    return {
      id: connectionRequest.id,
      url: connectionRequest.redirectUrl || '',
      status: this.statusMap[connectionRequest.status],
    };
  }

  async getConnections(
    cursor = 1,
    limit = 10,
    filters?: Record<string, any>,
  ): Promise<{ data: MCPConnection[]; total: number }> {
    const result: any = await this.composio.connectedAccounts.list({
      limit,
      cursor,
      authConfigIds: filters?.integrationId,
      userIds: filters?.organizationId,
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
  ): Promise<ConnectedAccountRetrieveResponse> {
    return this.composio.connectedAccounts.get(connectedAccountId);
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
