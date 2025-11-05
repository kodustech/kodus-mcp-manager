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
import { SmitheryClient } from 'src/clients/smithery';
import { IntegrationsService } from 'src/modules/integrations/integrations.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { MCPIntegrationAuthType } from 'src/modules/integrations/enums/integration.enum';

interface SmitheryIntegrationTemplate {
    integrationId: string;
    appName: string;
    displayName: string;
    baseUrl: string;
    protocol?: 'http' | 'sse';
    logoUrl?: string;
    serverName: string;
    authType: MCPIntegrationAuthType;
    requiredParams: MCPRequiredParam[];
}

export class SmitheryProvider extends BaseProvider {
    private readonly configService: ConfigService;
    private readonly integrationDescriptionService: IntegrationDescriptionService;
    private readonly integrationsService: IntegrationsService;
    
    statusMap: Record<string, MCPConnectionStatus> = {
        ACTIVE: MCPConnectionStatus.ACTIVE,
        INACTIVE: MCPConnectionStatus.INACTIVE,
        FAILED: MCPConnectionStatus.FAILED,
    };

    private static readonly TEMPLATES: SmitheryIntegrationTemplate[] = [
        {
            integrationId: 'smithery-exa-search',
            appName: 'exa-search',
            displayName: 'Exa Search',
            baseUrl: 'https://mcp.exa.ai/mcp',
            logoUrl: 'https://avatars.githubusercontent.com/u/82182631?s=200&v=4',
            serverName: 'exa-search',
            authType: MCPIntegrationAuthType.API_KEY,
            requiredParams: [
                {
                    name: 'apiKey',
                    displayName: 'Exa API Key',
                    description: 'Your Exa API key from https://exa.ai',
                    type: 'string',
                    required: true,
                },
            ],
        },
        {
            integrationId: 'smithery-sequential-thinking',
            appName: 'sequential-thinking',
            displayName: 'Sequential Thinking',
            baseUrl: 'https://server.smithery.ai/@smithery-ai/server-sequential-thinking/mcp',
            logoUrl: 'https://smithery.ai/favicon.ico',
            serverName: 'sequential-thinking',
            authType: MCPIntegrationAuthType.NONE,
            requiredParams: [],
        },
        {
            integrationId: 'smithery-azure-devops',
            appName: 'azure-devops',
            displayName: 'Azure DevOps',
            baseUrl: 'https://server.smithery.ai/@magemaclean/azure-devops-mcp/mcp',
            logoUrl: 'https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/azuredevops.svg',
            serverName: 'azure-devops',
            authType: MCPIntegrationAuthType.BEARER_TOKEN,
            requiredParams: [
                {
                    name: 'bearerToken',
                    displayName: 'Azure DevOps PAT',
                    description: 'Personal Access Token from Azure DevOps',
                    type: 'string',
                    required: true,
                },
                {
                    name: 'organization',
                    displayName: 'Organization Name',
                    description: 'Your Azure DevOps organization name',
                    type: 'string',
                    required: true,
                },
            ],
        },
        {
            integrationId: 'smithery-supermemory',
            appName: 'supermemory',
            displayName: 'Supermemory',
            baseUrl: 'https://server.smithery.ai/supermemory/mcp',
            logoUrl: 'https://supermemory.ai/logo.png',
            serverName: 'supermemory',
            authType: MCPIntegrationAuthType.BEARER_TOKEN,
            requiredParams: [
                {
                    name: 'bearerToken',
                    displayName: 'Supermemory API Key',
                    description: 'Your Supermemory API key from https://supermemory.ai',
                    type: 'string',
                    required: true,
                },
            ],
        },
        {
            integrationId: 'smithery-mem0',
            appName: 'mem0',
            displayName: 'Mem0',
            baseUrl: 'https://server.smithery.ai/@mem0ai/mem0-memory-mcp/mcp',
            logoUrl: 'https://avatars.githubusercontent.com/u/157014308?s=200&v=4',
            serverName: 'mem0',
            authType: MCPIntegrationAuthType.API_KEY,
            requiredParams: [
                {
                    name: 'apiKey',
                    displayName: 'Mem0 API Key',
                    description: 'Your Mem0 API key from https://app.mem0.ai',
                    type: 'string',
                    required: true,
                },
            ],
        },
        {
            integrationId: 'smithery-fetch',
            appName: 'fetch',
            displayName: 'Fetch',
            baseUrl: 'https://server.smithery.ai/@smithery-ai/fetch/mcp',
            logoUrl: 'https://smithery.ai/favicon.ico',
            serverName: 'fetch',
            authType: MCPIntegrationAuthType.NONE,
            requiredParams: [],
        },
        {
            integrationId: 'smithery-browserbase',
            appName: 'browserbase',
            displayName: 'Browserbase',
            baseUrl: 'https://server.smithery.ai/@browserbasehq/mcp-browserbase/mcp',
            logoUrl: 'https://avatars.githubusercontent.com/u/145268778?s=200&v=4',
            serverName: 'browserbase',
            authType: MCPIntegrationAuthType.API_KEY,
            requiredParams: [
                {
                    name: 'apiKey',
                    displayName: 'Browserbase API Key',
                    description: 'Your Browserbase API key from https://browserbase.com',
                    type: 'string',
                    required: true,
                },
                {
                    name: 'projectId',
                    displayName: 'Project ID',
                    description: 'Your Browserbase project ID',
                    type: 'string',
                    required: true,
                },
            ],
        },
    ];

    constructor(
        configService: ConfigService,
        integrationDescriptionService: IntegrationDescriptionService,
        integrationsService: IntegrationsService,
    ) {
        super();
        this.configService = configService;
        this.integrationDescriptionService = integrationDescriptionService;
        this.integrationsService = integrationsService;
    }

    private getTemplate(integrationId: string): SmitheryIntegrationTemplate {
        return SmitheryProvider.TEMPLATES.find(
            (t) => t.integrationId === integrationId,
        );
    }

    async getIntegrations(
        cursor: string = '',
        limit = 50,
        filters?: Record<string, any>,
    ): Promise<MCPIntegration[]> {
        const organizationId = filters?.organizationId;

        const templates = SmitheryProvider.TEMPLATES.map((template) => ({
            id: template.integrationId,
            name: template.displayName,
            description: this.integrationDescriptionService.getDescription(
                'smithery',
                template.appName,
            ),
            authScheme: template.authType,
            appName: template.appName,
            provider: MCPProviderType.SMITHERY,
            logo: template.logoUrl,
            baseUrl: template.baseUrl,
            protocol: template.protocol ?? 'http',
            isConnected: false,
        }));

        if (!organizationId) {
            return templates;
        }

        const createdIntegrations = await this.integrationsService.find({
            organizationId,
            active: true,
        });

        const smitheryIntegrations = createdIntegrations.filter(
            (integration) => this.isSmitheryIntegration(integration.baseUrl),
        );

        const connected = smitheryIntegrations.map((integration) => ({
            id: integration.id,
            name: integration.name,
            description: integration.description,
            authScheme: integration.authType,
            appName: integration.name,
            provider: MCPProviderType.SMITHERY,
            logo: integration.logoUrl,
            baseUrl: integration.baseUrl,
            protocol: integration.protocol,
            isConnected: true,
        }));

        const connectedBaseUrls = new Set(smitheryIntegrations.map(i => i.baseUrl));
        const availableTemplates = templates.filter(
            t => !connectedBaseUrls.has(t.baseUrl)
        );

        return [...connected, ...availableTemplates];
    }

    private isSmitheryIntegration(baseUrl: string): boolean {
        const smitheryDomains = [
            'mcp.exa.ai',
            'server.smithery.ai',
        ];
        
        return smitheryDomains.some(domain => baseUrl.includes(domain));
    }

    async getIntegration(
        integrationId: string,
        organizationId?: string,
    ): Promise<MCPIntegration> {
        if (organizationId) {
            const integration =
                await this.integrationsService.getIntegrationById(
                    integrationId,
                    organizationId,
                );

            if (integration) {
                return {
                    id: integration.id,
                    name: integration.name,
                    description: integration.description,
                    authScheme: integration.authType,
                    appName: integration.name,
                    provider: MCPProviderType.SMITHERY,
                    logo: integration.logoUrl,
                    baseUrl: integration.baseUrl,
                    protocol: integration.protocol,
                    isConnected: true,
                };
            }
        }

        const template = this.getTemplate(integrationId);
        if (!template) {
            throw new NotFoundException(
                `Smithery integration ${integrationId} not found`,
            );
        }

        return {
            id: template.integrationId,
            name: template.displayName,
            description: this.integrationDescriptionService.getDescription(
                'smithery',
                template.appName,
            ),
            authScheme: template.authType,
            appName: template.appName,
            provider: MCPProviderType.SMITHERY,
            logo: template.logoUrl,
            baseUrl: template.baseUrl,
            protocol: template.protocol ?? 'http',
            isConnected: false,
        };
    }

    getIntegrationRequiredParams(
        integrationId: string,
    ): Promise<MCPRequiredParam[]> {
        const template = this.getTemplate(integrationId);
        if (!template) {
            return Promise.resolve([]);
        }
        return Promise.resolve(template.requiredParams);
    }

    async getIntegrationTools(
        integrationId: string,
        organizationId: string,
    ): Promise<MCPTool[]> {
        try {
            const integration =
                await this.integrationsService.getIntegrationById(
                    integrationId,
                    organizationId,
                );

            if (!integration) {
                throw new NotFoundException('Smithery integration not found');
            }

            const client = this.createClient(integration);
            const tools = await client.getTools();

            return tools;
        } catch (error) {
            console.error(
                `Error fetching tools for Smithery integration ${integrationId}:`,
                error,
            );
            return [];
        }
    }

    async initiateConnection(
        config: MCPConnectionConfig,
    ): Promise<MCPConnection> {
        try {
            const template = this.getTemplate(config.integrationId);
            if (!template) {
                throw new BadRequestException(
                    `Smithery template ${config.integrationId} not found`,
                );
            }

            if (template.requiredParams.length > 0) {
                this.validateRequiredParams(template.requiredParams, config.params);
            }

            const headers: Array<{ key: string; value: string }> = [];

            const integrationDto: any = {
                name: template.displayName,
                description: this.integrationDescriptionService.getDescription(
                    'smithery',
                    template.appName,
                ),
                baseUrl: template.baseUrl,
                protocol: template.protocol ?? 'http',
                authType: template.authType,
                logoUrl: template.logoUrl,
            };

            if (template.authType === MCPIntegrationAuthType.API_KEY) {
                integrationDto.apiKey = config.params?.apiKey;
                if (template.appName === 'exa-search') {
                    integrationDto.apiKeyHeader = 'x-api-key';
                    headers.push({ key: 'x-api-key', value: config.params?.apiKey });
                } else if (template.appName === 'mem0') {
                    integrationDto.apiKeyHeader = 'Authorization';
                    headers.push({ key: 'Authorization', value: `Bearer ${config.params?.apiKey}` });
                } else if (template.appName === 'browserbase') {
                    integrationDto.apiKeyHeader = 'x-api-key';
                    headers.push({ key: 'x-api-key', value: config.params?.apiKey });
                    if (config.params?.projectId) {
                        headers.push({ key: 'x-project-id', value: config.params.projectId });
                    }
                } else {
                    integrationDto.apiKeyHeader = 'Authorization';
                    headers.push({ key: 'Authorization', value: config.params?.apiKey });
                }
            } else if (template.authType === MCPIntegrationAuthType.BEARER_TOKEN) {
                integrationDto.bearerToken = config.params?.bearerToken;
                headers.push({ 
                    key: 'Authorization', 
                    value: `Bearer ${config.params?.bearerToken}` 
                });
                
                if (template.appName === 'azure-devops' && config.params?.organization) {
                    headers.push({ 
                        key: 'X-Azure-Organization', 
                        value: config.params.organization 
                    });
                }
            }

            if (headers.length > 0) {
                integrationDto.headers = headers;
            }

            const integration = await this.integrationsService.createIntegration(
                config.organizationId,
                integrationDto,
            );

            const integrationInterface = await this.integrationsService.getIntegrationById(
                integration.id,
                config.organizationId,
            );

            const client = this.createClient(integrationInterface);
            const tools = await client.getTools();
            const allToolSlugs = tools.map((tool) => tool.slug);

            return {
                id: integration.id,
                appName: integrationInterface.name,
                authUrl: null,
                mcpUrl: integrationInterface.baseUrl,
                status: MCPConnectionStatus.ACTIVE,
                allowedTools: config.allowedTools || allToolSlugs,
            };
        } catch (error) {
            console.error(
                `Error initiating Smithery connection for ${config.integrationId}:`,
                error,
            );
            throw error;
        }
    }

    deleteConnection(connectionId: string): Promise<void> {
        return Promise.resolve();
    }

    getConnections(
        cursor?: string,
        limit?: number,
        filters?: Record<string, any>,
    ): Promise<{ data: MCPConnection[]; total: number }> {
        throw new Error('Method not implemented for Smithery provider.');
    }

    private createClient(integration: any): SmitheryClient {
        let headers: Record<string, string> | undefined;

        if (integration.headers && Object.keys(integration.headers).length > 0) {
            headers = integration.headers;
        }

        return new SmitheryClient(
            integration.baseUrl,
            integration.protocol ?? 'http',
            integration.name,
            headers,
        );
    }

    private validateRequiredParams(
        requiredParams: MCPRequiredParam[],
        params: Record<string, any>,
    ): void {
        if (!params) {
            throw new BadRequestException(
                `Missing required params: ${requiredParams.map((p) => p.name).join(', ')}`,
            );
        }

        const missingParams = requiredParams
            .filter((param) => param.required && !params[param.name])
            .map((param) => param.name);

        if (missingParams.length > 0) {
            throw new BadRequestException(
                `Missing required params: ${missingParams.join(', ')}`,
            );
        }
    }
}
