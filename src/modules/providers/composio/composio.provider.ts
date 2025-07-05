import {
  MCPConnection,
  MCPConnectionConfig,
  MCPIntegration,
  MCPProviderConfig,
  MCPServer,
  MCPServerConfig,
  MCPRequiredParam,
  MCPInstallIntegration,
} from '../interfaces/provider.interface';
import { BaseProvider } from '../base.provider';
import { ConfigService } from '@nestjs/config';
import { MCPConnectionStatus } from '../../mcp/entities/mcp-connection.entity';
import { BadRequestException } from '@nestjs/common';
import { ComposioClient } from '../../../clients/composio';

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

    this.client = new ComposioClient(configService);
  }

  private getMCPUrl(serverId: string, authConfigId: string): string {
    return `https://mcp.composio.dev/composio/server/${serverId}/mcp?connected_account_id=${authConfigId}`;
  }

  private validateRequiredParams(
    requiredParams: MCPRequiredParam[],
    params: MCPInstallIntegration,
  ): void {
    if (requiredParams.length === 0) return;

    if (!params) {
      throw new BadRequestException(
        `Missing required params: ${requiredParams.map((param) => param.name).join(', ')}`,
      );
    }

    const missingParams = [];
    requiredParams.forEach((param) => {
      if (params[param.name] === undefined && param.required) {
        missingParams.push(param.name);
      }
    });

    if (missingParams.length > 0) {
      throw new BadRequestException(
        `Missing required params: ${missingParams.join(', ')}`,
      );
    }
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
      allowedTools: integration.restrict_to_following_tools,
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
    //this.validateConfig(config);

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

    // TODO: UPSERT CONNECTED ACCOUNT

    const connectionRequest = await this.client.createConnectedAccount({
      integrationId: integration.id,
      userId: organizationId,
      authScheme: integration.authScheme,
      callbackUrl: redirectUrl,
      params: config.params,
    });

    const mcp = await this.client.getMCPServer(integrationId);

    let allowedTools = config.allowedTools;

    if (!allowedTools?.length) allowedTools = integration.allowedTools;

    if (!allowedTools?.length)
      allowedTools = (await this.getIntegrationTools(integrationId)).map(
        (tool) => tool.slug,
      );

    return {
      id: connectionRequest.id,
      appName: integration.appName,
      authUrl: connectionRequest.redirect_url || '',
      status: this.statusMap[connectionRequest.status],
      mcpUrl: this.getMCPUrl(mcp.id, connectionRequest.id),
      allowedTools: allowedTools,
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
    // this.validateConfig(config);
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

  async getMCPServer(integrationId: string): Promise<{ items: MCPServer[] }> {
    this.validateId(integrationId, 'Integration');

    const data = await this.client.getMCPServer(integrationId);

    return { items: [data] } as any;
  }
}
