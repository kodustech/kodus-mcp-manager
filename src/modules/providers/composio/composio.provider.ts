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
import { ComposioClient } from 'src/clients/composio';

export class ComposioProvider extends BaseProvider {
  private readonly client: ComposioClient;
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

    /* this.composio = new Composio({
      apiKey: this.config.apiKey,
      baseURL: 'https://backend.composio.dev',
    }); */
    this.client = new ComposioClient(configService);
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
    const result = await this.client.getIntegrations({
      limit,
      cursor,
      ...filters,
    });

    return result.items.map((integration) => ({
      id: integration.id,
      name: integration.name,
      description: '',
      authScheme: integration.auth_scheme,
      appName: integration.toolkit.slug,
      logo: integration.toolkit.logo,
      provider: 'composio',
    }));
  }

  async getIntegration(integrationId: string): Promise<MCPIntegration> {
    this.validateId(integrationId, 'Integration');
    const integration = await this.client.getIntegration(integrationId);
    return {
      id: integration.id,
      name: integration.name,
      description: '',
      authScheme: integration.auth_scheme,
      appName: integration.toolkit.slug,
      logo: integration.toolkit.logo,
      provider: 'composio',
    };
  }

  async getIntegrationRequiredParams(
    integrationId: string,
  ): Promise<MCPRequiredParam[]> {
    this.validateId(integrationId, 'Integration');
    const integration = await this.client.getIntegration(integrationId);
    return (
      integration.expected_input_fields?.map((param: any) => ({
        name: param.name,
        displayName: param.displayName,
        description: param.description,
        type: param.type,
        required: param.required,
      })) || []
    );
  }

  async getIntegrationTools(integrationId: string): Promise<any[]> {
    this.validateId(integrationId, 'Integration');
    const integration = await this.client.getIntegration(integrationId);

    const { items } = await this.client.getTools({
      appName: integration.toolkit.slug,
      tools: integration.restrict_to_following_tools,
    });

    return items.map((tool) => ({
      slug: tool.slug,
      name: tool.name,
      description: tool.description,
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

    const connectionRequest = await this.client.createConnectedAccount({
      integrationId: integration.id,
      userId: organizationId,
      authScheme: integration.authScheme,
      callbackUrl: redirectUrl,
      params: config.params,
    });
    console.log(
      '🚀 ~ ComposioProvider ~ connectionRequest:',
      connectionRequest,
    );

    return {
      id: connectionRequest.id,
      url: connectionRequest.redirect_url || '',
      status: this.statusMap[connectionRequest.status],
    };
  }

  async getConnections(
    cursor = '',
    limit = 10,
    filters?: Record<string, any>,
  ): Promise<{ data: MCPConnection[]; total: number }> {
    const result: any = await this.client.getConnectedAccounts({
      limit,
      cursor,
      integrationIds: filters?.integrationId,
      appNames: filters?.appName,
    });

    return {
      data: result.data.map((connection) => ({
        id: connection.id,
        status: connection.status,
      })),
      total: result.total,
    };
  }

  async getConnection(connectedAccountId: string): Promise<any> {
    return this.client.getConnectedAccount(connectedAccountId);
  }

  async createMCPServer(config: MCPServerConfig): Promise<MCPServer> {
    this.validateConfig(config);
    const {
      organizationId,
      appName,
      authConfigId,
      allowedTools,
      integrationId,
    } = config;

    const data: any = await this.client.createMCPServer({
      appName,
      userId: organizationId,
      integrationId,
      connectedAccountId: authConfigId,
      allowedTools,
    });

    return {
      id: data.id,
      name: data.name,
      authConfigIds: data.auth_config_ids,
      mcpUrl: this.getMCPUrl(data.id, authConfigId),
    } as any;
  }

  async getMCPServer(authConfigId: string): Promise<{ items: MCPServer[] }> {
    this.validateId(authConfigId, 'Auth Config');

    const data = await this.client.getMCPServer(authConfigId);

    return { items: [data] } as any;
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

    const integration = await this.getIntegration(integrationId);

    const server = await this.createMCPServer({
      organizationId,
      appName: integration.appName,
      integrationId,
      authConfigId: initiateConnection.id,
      allowedTools: allowedTools,
    });

    return {
      server: {
        ...server,
        appName: integration.appName,
      },
      connection: {
        id: initiateConnection.id,
        status: initiateConnection.status,
        url: initiateConnection.url,
      },
    };
  }
}
