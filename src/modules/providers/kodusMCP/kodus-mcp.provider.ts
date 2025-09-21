import { MCPConnectionStatus } from 'src/modules/mcp/entities/mcp-connection.entity';
import { BaseProvider } from '../base.provider';
import {
  MCPIntegration,
  MCPRequiredParam,
  MCPTool,
  MCPConnectionConfig,
  MCPConnection,
  MCPProviderConfig,
  MCPProviderType,
} from '../interfaces/provider.interface';
import { ConfigService } from '@nestjs/config';
import { IntegrationDescriptionService } from '../services/integration-description.service';
import { KodusMCPClient } from 'src/clients/kodusMCP';

export class KodusMCPProvider extends BaseProvider {
  private readonly client: KodusMCPClient;
  private readonly config: MCPProviderConfig;
  private readonly integrationDescriptionService: IntegrationDescriptionService;
  statusMap: Record<string, MCPConnectionStatus>;

  constructor(
    configService: ConfigService,
    integrationDescriptionService: IntegrationDescriptionService,
  ) {
    super();

    this.client = new KodusMCPClient();
    this.integrationDescriptionService = integrationDescriptionService;
  }

  async getIntegrations(
    cursor: string = '',
    limit = 50,
    filters?: Record<string, any>,
  ): Promise<MCPIntegration[]> {
    const integration = await this.client.getIntegration();

    return [
      {
        ...integration,
        provider: MCPProviderType.KODUSMCP,
        isDefault: true,
      },
    ];
  }

  async getIntegration(integrationId: string): Promise<MCPIntegration> {
    const integration = await this.client.getIntegration();

    return {
      id: integration.id,
      name: integration.name,
      description: this.integrationDescriptionService.getDescription(
        'composio',
        integration.appName,
      ),
      authScheme: integration.authScheme,
      appName: integration.appName,
      logo: integration.logo,
      provider: MCPProviderType.KODUSMCP,
      isDefault: true,
    };
  }

  getIntegrationRequiredParams(
    integrationId: string,
  ): Promise<MCPRequiredParam[]> {
    return null;
  }

  async getIntegrationTools(
    integrationId: string,
    organizationId: string,
  ): Promise<MCPTool[]> {
    this.validateId(integrationId, 'Integration');
    const integration = await this.client.getIntegration();

    const tools = await this.client.getTools();

    return tools.map((tool) => ({
      slug: tool.slug,
      name: tool.name,
      description: tool.description,
      provider: MCPProviderType.KODUSMCP,
      warning: this.hasWarning(tool.name || tool.slug),
    }));
  }

  // async getAvailableTools(
  //   integrationId: string,
  //   organizationId: string,
  // ): Promise<MCPTool[]> {
  //   return Promise.resolve(this.client.getAvailableTools());
  // }

  // async getSelectedTools(
  //   integrationId: string,
  //   organizationId: string,
  // ): Promise<string[]> {
  //   return Promise.resolve(this.client.getSelectedTools(organizationId));
  // }

  async updateSelectedTools(
    integrationId: string,
    organizationId: string,
    selectedTools: string[],
  ): Promise<{ success: boolean; message: string; selectedTools: string[] }> {
    return Promise.resolve(
      this.client.updateSelectedTools(organizationId, selectedTools),
    );
  }

  initiateConnection(config: MCPConnectionConfig): Promise<MCPConnection> {
    throw new Error('Method not implemented.');
  }
  deleteConnection(connectionId: string): Promise<void> {
    throw new Error('Method not implemented.');
  }

  getConnections(
    cursor?: string,
    limit?: number,
    filters?: Record<string, any>,
  ): Promise<{ data: MCPConnection[]; total: number }> {
    throw new Error('Method not implemented.');
  }

  private hasWarning(toolName: string): boolean {
    const warningKeywords = [
      'delete',
      'remove',
      'archive',
      'destroy',
      'drop',
      'clear',
      'erase',
      'purge',
      'terminate',
      'kill',
      'stop',
      'disable',
      'suspend',
      'revoke',
      'cancel',
      'reject',
      'deny',
      'block',
      'ban',
      'uninstall',
      'reset',
      'revert',
      'undo',
      'rollback',
      'flush',
      'wipe',
      'truncate',
    ];
    const lowerToolName = toolName.toLowerCase();
    return warningKeywords.some((keyword) => lowerToolName.includes(keyword));
  }
}
