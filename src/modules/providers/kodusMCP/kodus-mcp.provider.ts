import { MCPConnectionStatus } from 'src/modules/mcp/entities/mcp-connection.entity';
import { BaseProvider } from '../base.provider';
import {
    MCPIntegration,
    MCPRequiredParam,
    MCPTool,
    MCPConnectionConfig,
    MCPConnection,
    MCPProviderType,
} from '../interfaces/provider.interface';
import { ConfigService } from '@nestjs/config';
import { IntegrationDescriptionService } from '../services/integration-description.service';
import { KodusMCPClient } from 'src/clients/kodusMCP';
import { Context7Client } from 'src/clients/context7';

interface ManagedHttpIntegrationConfig {
    integrationId: string;
    appName: string;
    displayName: string;
    baseUrl: string;
    protocol?: 'http' | 'sse';
    logoUrl?: string;
    serverName: string;
}

export class KodusMCPProvider extends BaseProvider {
    private readonly client: KodusMCPClient;
    private readonly integrationDescriptionService: IntegrationDescriptionService;
    private readonly managedHttpIntegrations: Map<
        string,
        { config: ManagedHttpIntegrationConfig; client: Context7Client }
    > = new Map();
    statusMap: Record<string, MCPConnectionStatus> = {
        ACTIVE: MCPConnectionStatus.ACTIVE,
        INACTIVE: MCPConnectionStatus.INACTIVE,
        FAILED: MCPConnectionStatus.FAILED,
    };

    private static readonly MANAGED_HTTP_CONFIGS: ManagedHttpIntegrationConfig[] =
        [
            {
                integrationId: 'context7-default',
                appName: 'context7',
                displayName: 'Context7',
                baseUrl: 'https://context7-kodus.up.railway.app/mcp',
                logoUrl:
                    'https://avatars.githubusercontent.com/u/74989412?s=48&v=4',
                serverName: 'context7',
            },
            {
                integrationId: 'kodus-docs-default',
                appName: 'kodusdocs',
                displayName: 'Kodus Docs',
                baseUrl: 'https://docs.kodus.io/mcp',
                logoUrl:
                    'https://kodus.io/wp-content/uploads/2025/11/Kodus-AI-Logo-6.png',
                serverName: 'kodus-docs',
            },
        ];

    constructor(
        _configService: ConfigService,
        integrationDescriptionService: IntegrationDescriptionService,
    ) {
        super();

        this.client = new KodusMCPClient();
        this.integrationDescriptionService = integrationDescriptionService;
        for (const config of KodusMCPProvider.MANAGED_HTTP_CONFIGS) {
            const client = new Context7Client(
                config.baseUrl,
                config.protocol ?? 'http',
                config.serverName,
            );

            this.managedHttpIntegrations.set(config.integrationId, {
                config,
                client,
            });
        }
    }

    async getIntegrations(
        cursor: string = '',
        limit = 50,
        filters?: Record<string, any>,
    ): Promise<MCPIntegration[]> {
        const integration = await this.client.getIntegration();
        const managedIntegrations = await Promise.all(
            Array.from(this.managedHttpIntegrations.keys()).map(
                (integrationId) =>
                    this.buildManagedHttpIntegration(integrationId),
            ),
        );

        return [
            {
                ...integration,
                provider: MCPProviderType.KODUSMCP,
                isDefault: true,
            },
            ...managedIntegrations,
        ];
    }

    async getIntegration(integrationId: string): Promise<MCPIntegration> {
        if (this.managedHttpIntegrations.has(integrationId)) {
            return this.buildManagedHttpIntegration(integrationId);
        }

        const integration = await this.client.getIntegration();

        if (integration.id !== integrationId) {
            throw new Error(
                `Integration ${integrationId} não suportada pela Kodus`,
            );
        }

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
            allowedTools: integration.allowedTools,
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

        const managed = this.managedHttpIntegrations.get(integrationId);
        if (managed) {
            return this.safeGetTools(managed.client);
        }
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
        if (this.managedHttpIntegrations.has(integrationId)) {
            return {
                success: true,
                message:
                    'Selected tools updated for managed Kodus MCP integration.',
                selectedTools,
            };
        }
        return Promise.resolve(
            this.client.updateSelectedTools(organizationId, selectedTools),
        );
    }

    async initiateConnection(
        config: MCPConnectionConfig,
    ): Promise<MCPConnection> {
        const managed = this.managedHttpIntegrations.get(config.integrationId);
        if (managed) {
            const tools = await this.safeGetTools(managed.client);
            const allToolSlugs = tools.map((tool) => tool.slug);

            const allowedTools =
                config.allowedTools && config.allowedTools.length > 0
                    ? config.allowedTools
                    : allToolSlugs;

            return {
                id: managed.config.integrationId,
                appName: managed.config.displayName,
                authUrl: null,
                mcpUrl: managed.config.baseUrl,
                status: MCPConnectionStatus.ACTIVE,
                allowedTools,
            };
        }

        throw new Error(
            `Integration ${config.integrationId} não suportada para conexão Kodus`,
        );
    }

    deleteConnection(connectionId: string): Promise<void> {
        return Promise.resolve();
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
        return warningKeywords.some((keyword) =>
            lowerToolName.includes(keyword),
        );
    }

    private async buildManagedHttpIntegration(
        integrationId: string,
    ): Promise<MCPIntegration> {
        const entry = this.managedHttpIntegrations.get(integrationId);

        if (!entry) {
            throw new Error(
                `Integration ${integrationId} não suportada pela Kodus`,
            );
        }

        const tools = await this.safeGetTools(entry.client);

        return {
            id: entry.config.integrationId,
            name: entry.config.displayName,
            description: this.integrationDescriptionService.getDescription(
                'kodusmcp',
                entry.config.appName,
            ),
            authScheme: 'none',
            appName: entry.config.appName,
            logo: entry.config.logoUrl,
            provider: MCPProviderType.KODUSMCP,
            allowedTools: tools.map((tool) => tool.slug),
            baseUrl: entry.config.baseUrl,
            protocol: entry.config.protocol ?? 'http',
            isDefault: false,
        };
    }

    private async safeGetTools(client: Context7Client): Promise<MCPTool[]> {
        try {
            return await client.getTools();
        } catch (error) {
            console.error('Failed to fetch managed Kodus MCP tools:', error);
            return [];
        }
    }
}
