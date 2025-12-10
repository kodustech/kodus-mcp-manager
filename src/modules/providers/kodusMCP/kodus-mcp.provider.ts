import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { CustomClient } from 'src/clients/custom';
import { KodusMCPClient } from 'src/clients/kodusMCP';
import {
    MCPIntegrationAuthType,
    MCPIntegrationProtocol,
} from 'src/modules/integrations/enums/integration.enum';
import { MCPIntegrationAllUniqueFields } from 'src/modules/integrations/interfaces/mcp-integration.interface';
import { MCPConnectionStatus } from 'src/modules/mcp/entities/mcp-connection.entity';
import { BaseProvider } from '../base.provider';
import {
    MCPConnection,
    MCPConnectionConfig,
    MCPIntegration,
    MCPProviderType,
    MCPRequiredParam,
    MCPTool,
} from '../interfaces/provider.interface';
import { IntegrationDescriptionService } from '../services/integration-description.service';

interface ManagedIntegrationConfig {
    id: string;
    appName: string;
    displayName: string;
    baseUrl: string;
    protocol: MCPIntegrationProtocol;
    logoUrl: string;
    serverName: string;
    headers: Record<string, string>;
    auth: {
        type: MCPIntegrationAuthType;
    } & MCPIntegrationAllUniqueFields;
}

export class KodusMCPProvider extends BaseProvider {
    private readonly client: KodusMCPClient;
    private readonly integrationDescriptionService: IntegrationDescriptionService;
    private readonly managedIntegrations: Map<
        string,
        { config: ManagedIntegrationConfig; client: CustomClient }
    > = new Map();
    statusMap: Record<string, MCPConnectionStatus> = {
        ACTIVE: MCPConnectionStatus.ACTIVE,
        INACTIVE: MCPConnectionStatus.INACTIVE,
        FAILED: MCPConnectionStatus.FAILED,
    };
    constructor(
        _configService: ConfigService,
        integrationDescriptionService: IntegrationDescriptionService,
    ) {
        super();

        this.client = new KodusMCPClient();
        this.integrationDescriptionService = integrationDescriptionService;

        this.loadManagedIntegrationsFromConfig();
    }

    private loadManagedIntegrationsFromConfig() {
        try {
            const configPath = path.resolve(
                __dirname,
                '../../../config/managed-mcp-servers.json',
            );

            if (!fs.existsSync(configPath)) {
                return;
            }

            const raw = fs.readFileSync(configPath, 'utf-8');
            const managedConfigs = JSON.parse(
                raw,
            ) as ManagedIntegrationConfig[];

            for (const entry of managedConfigs) {
                const client = new CustomClient(
                    this.transformManagedIntegration(entry),
                );

                this.managedIntegrations.set(entry.id, {
                    config: entry,
                    client,
                });
            }
        } catch (error) {
            console.error(
                'Failed to load managed HTTP integrations from config:',
                error,
            );
        }
    }

    private transformManagedIntegration(
        managed: ManagedIntegrationConfig,
    ): ConstructorParameters<typeof CustomClient>[0] {
        return {
            id: managed.id,
            name: managed.displayName,
            authType: managed.auth.type,
            protocol: managed.protocol,
            baseUrl: managed.baseUrl,
            logoUrl: managed.logoUrl,
            headers: managed.headers,
            serverName: managed.serverName,
            providerType: MCPProviderType.KODUSMCP,
            ...managed.auth,
        } as unknown as ConstructorParameters<typeof CustomClient>[0];
    }

    async getIntegrations(
        cursor: string = '',
        limit = 50,
        filters?: Record<string, any>,
    ): Promise<MCPIntegration[]> {
        const integration = await this.client.getIntegration();
        const managedIntegrations = await Promise.all(
            Array.from(this.managedIntegrations.keys()).map((integrationId) =>
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
        if (this.managedIntegrations.has(integrationId)) {
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

        const managed = this.managedIntegrations.get(integrationId);
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
        if (this.managedIntegrations.has(integrationId)) {
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
        const managed = this.managedIntegrations.get(config.integrationId);
        if (managed) {
            const tools = await this.safeGetTools(managed.client);
            const allToolSlugs = tools.map((tool) => tool.slug);

            const allowedTools =
                config.allowedTools && config.allowedTools.length > 0
                    ? config.allowedTools
                    : allToolSlugs;

            return {
                id: managed.config.id,
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
        const entry = this.managedIntegrations.get(integrationId);

        if (!entry) {
            throw new Error(
                `Integration ${integrationId} não suportada pela Kodus`,
            );
        }

        const tools = await this.safeGetTools(entry.client);

        return {
            id: entry.config.id,
            name: entry.config.displayName,
            description: this.integrationDescriptionService.getDescription(
                'kodusmcp',
                entry.config.appName,
            ),
            authScheme: entry.config.auth.type,
            appName: entry.config.appName,
            logo: entry.config.logoUrl,
            provider: MCPProviderType.KODUSMCP,
            allowedTools: tools.map((tool) => tool.slug),
            baseUrl: entry.config.baseUrl,
            protocol: entry.config.protocol ?? 'http',
            isDefault: false,
        };
    }

    private async safeGetTools(client: CustomClient): Promise<MCPTool[]> {
        try {
            return await client.getTools();
        } catch (error) {
            console.error('Failed to fetch managed Kodus MCP tools:', error);
            return [];
        }
    }
}
