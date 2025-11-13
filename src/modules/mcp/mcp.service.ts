import { Injectable, NotFoundException } from '@nestjs/common';
import { ProviderFactory } from '../providers/provider.factory';
import { QueryDto } from './dto/query.dto';
import {
    MCPConnectionEntity,
    MCPConnectionStatus,
} from './entities/mcp-connection.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { InitiateConnectionDto } from './dto/initiate-connection.dto';
import { UpdateConnectionDto } from './dto/update-connection.dto';
import { CreateIntegrationDto } from './dto/create-integration.dto';
import { IntegrationsService } from '../integrations/integrations.service';
import { MCPIntegrationAuthType } from '../integrations/enums/integration.enum';
import { FinishOAuthDto } from './dto/finish-oauth.dto';

@Injectable()
export class McpService {
    constructor(
        private providerFactory: ProviderFactory,
        @InjectRepository(MCPConnectionEntity)
        private connectionRepository: Repository<MCPConnectionEntity>,
        private readonly integrationsService: IntegrationsService,
    ) {}

    async getConnections(query: QueryDto, organizationId: string) {
        const { page, pageSize, ...where } = query;
        const [items, total] = await this.connectionRepository.findAndCount({
            where: { organizationId, ...where },
            skip: (page - 1) * pageSize,
            take: pageSize,
        });
        return { items, total };
    }

    private async getConnectionById(
        connectionId: string,
        organizationId: string,
    ) {
        // Try to find by UUID first
        let connection = await this.connectionRepository.findOne({
            where: { id: connectionId, organizationId },
        });

        // If not found and looks like Composio ID, try other ways
        if (!connection && connectionId.startsWith('ca_')) {
            connection = await this.connectionRepository.findOne({
                where: {
                    organizationId,
                    metadata: { connection: { id: connectionId } },
                },
            });
        }

        return connection;
    }

    async getConnection(connectionId: string, organizationId: string) {
        return this.getConnectionById(connectionId, organizationId);
    }

    async getIntegrations(query: QueryDto, organizationId: string) {
        const promises = this.providerFactory.getProviders().map((provider) => {
            const { page, pageSize, appName } = query;
            return provider.getIntegrations(String(page), pageSize, {
                appName,
                organizationId,
            });
        });

        const integrations = (await Promise.all(promises))?.flat() || [];
        const connections = await this.connectionRepository.find({
            where: { organizationId },
        });
        return integrations?.map((integration) => {
            const connection = connections?.find(
                (connection) => connection.integrationId === integration.id,
            );

            if (
                integration.provider === 'kodusmcp' &&
                integration.isDefault
            ) {
                return {
                    ...integration,
                    isConnected: true,
                    connectionStatus: MCPConnectionStatus.ACTIVE,
                };
            }

            return {
                ...integration,
                isConnected: !!connection,
                connectionStatus: connection?.status,
            };
        });
    }

    async getIntegration(
        integrationId: string,
        providerType: string,
        organizationId: string,
    ) {
        const provider = this.providerFactory.getProvider(providerType);
        const integration = await provider.getIntegration(integrationId);

        const requiredParams = await this.getIntegrationRequiredParams(
            integrationId,
            providerType,
        );

        const connections = await this.connectionRepository.findOne({
            where: { integrationId, organizationId },
        });

        return {
            ...integration,
            requiredParams,
            isConnected: !!connections,
            connectionStatus: connections?.status,
        };
    }

    getIntegrationRequiredParams(integrationId: string, providerType: string) {
        const provider = this.providerFactory.getProvider(providerType);
        return provider.getIntegrationRequiredParams(integrationId);
    }

    getIntegrationTools(
        integrationId: string,
        organizationId: string,
        providerType: string,
    ) {
        const provider = this.providerFactory.getProvider(providerType);
        return provider.getIntegrationTools(integrationId, organizationId);
    }

    async initiateConnection(
        organizationId: string,
        providerType: string,
        body: InitiateConnectionDto,
    ) {
        const provider = this.providerFactory.getProvider(providerType);

        const data = {
            integrationId: body.integrationId,
            organizationId,
            params: body.authParams,
            allowedTools: body.allowedTools,
        };

        const connection = await provider.initiateConnection(data);

        const existingConnection = await this.connectionRepository.findOne({
            where: { integrationId: body.integrationId, organizationId },
        });

        const newConnection = {
            integrationId: body.integrationId,
            organizationId,
            status: connection.status,
            provider: providerType,
            mcpUrl: connection.mcpUrl,
            appName: connection.appName,
            allowedTools: connection.allowedTools,
            metadata: {
                connection,
            },
        };

        const updatedConnection = Object.assign(
            existingConnection || {},
            newConnection,
        );

        return this.connectionRepository.save(updatedConnection);
    }

    async updateConnection(body: UpdateConnectionDto, organizationId: string) {
        const { integrationId } = body;
        const connection = await this.connectionRepository.findOne({
            where: { integrationId, organizationId },
        });

        if (!connection) {
            throw new NotFoundException('Connection not found');
        }

        const provider = this.providerFactory.getProvider(connection.provider);

        const updatedConnection = Object.assign(connection, {
            status: provider.statusMap[body.status],
            metadata: {
                ...connection.metadata,
                ...body.metadata,
                connection: {
                    ...(connection.metadata?.connection || {}),
                    status: provider.statusMap[body.status],
                },
            },
        });

        await this.connectionRepository.save(updatedConnection);

        return updatedConnection;
    }

    async deleteConnection(connectionId: string, organizationId: string) {
        const connection = await this.getConnectionById(
            connectionId,
            organizationId,
        );

        if (!connection) {
            throw new NotFoundException(
                `Connection with ID ${connectionId} not found`,
            );
        }

        const provider = this.providerFactory.getProvider(connection.provider);

        const composioConnectionId = connection.metadata?.connection?.id;

        if (!composioConnectionId) {
            console.warn(
                'Composio connection ID not found in metadata, using provided ID',
            );
        }

        await provider.deleteConnection(composioConnectionId || connectionId);

        await this.connectionRepository.delete(connection.id);

        return { message: 'Connection deleted successfully' };
    }

    async updateAllowedTools(
        integrationId: string,
        allowedTools: string[],
        organizationId: string,
    ) {
        const connection = await this.connectionRepository.findOne({
            where: { integrationId, organizationId },
        });

        if (!connection) {
            throw new NotFoundException('Connection not found');
        }

        const updatedConnection = Object.assign(connection, {
            allowedTools: allowedTools,
        });

        await this.connectionRepository.save(updatedConnection);

        return {
            message: 'Allowed tools updated successfully',
            connection: {
                id: updatedConnection.id,
                integrationId: updatedConnection.integrationId,
                allowedTools: updatedConnection.allowedTools,
            },
        };
    }

    async getAvailableTools(
        integrationId: string,
        providerType: string,
        organizationId: string,
    ) {
        const provider = this.providerFactory.getProvider(providerType);

        // Check if provider has getAvailableTools method
        if ('getAvailableTools' in provider) {
            return await (provider as any).getAvailableTools(
                integrationId,
                organizationId,
            );
        }

        // Fallback to getIntegrationTools
        return await provider.getIntegrationTools(
            integrationId,
            organizationId,
        );
    }

    async getSelectedTools(
        integrationId: string,
        providerType: string,
        organizationId: string,
    ) {
        const provider = this.providerFactory.getProvider(providerType);

        // Check if provider has getSelectedTools method
        if ('getSelectedTools' in provider) {
            return await (provider as any).getSelectedTools(
                integrationId,
                organizationId,
            );
        }

        // Fallback: get from connection allowedTools
        const connection = await this.connectionRepository.findOne({
            where: { integrationId, organizationId },
        });

        return connection?.allowedTools || [];
    }

    async updateSelectedTools(
        integrationId: string,
        providerType: string,
        organizationId: string,
        selectedTools: string[],
    ) {
        const provider = this.providerFactory.getProvider(providerType);

        // Check if provider has updateSelectedTools method
        if ('updateSelectedTools' in provider) {
            const result = await (provider as any).updateSelectedTools(
                integrationId,
                organizationId,
                selectedTools,
            );

            // Also update the connection's allowedTools
            const connection = await this.connectionRepository.findOne({
                where: { integrationId, organizationId },
            });

            if (connection) {
                connection.allowedTools = selectedTools;
                await this.connectionRepository.save(connection);
            }

            return result;
        }

        // Fallback: update connection allowedTools
        return await this.updateAllowedTools(
            integrationId,
            selectedTools,
            organizationId,
        );
    }

    async getCustomIntegrations(organizationId: string) {
        return this.integrationsService.find({
            organizationId,
            active: true,
        });
    }

    async getCustomIntegration(organizationId: string, integrationId: string) {
        return this.integrationsService.findOne({
            organizationId,
            id: integrationId,
            active: true,
        });
    }

    async createIntegration(
        organizationId: string,
        providerType: string,
        createIntegrationDto: CreateIntegrationDto,
    ) {
        const { integrationId, baseUrl, authType, name, protocol } =
            createIntegrationDto;

        if (providerType === 'kodusmcp') {
            return this.createKodusMCPIntegration(
                organizationId,
                integrationId,
                baseUrl || '',
            );
        }

        if (providerType === 'custom') {
            // baseUrl is already validated in DTO
            if (
                authType !== undefined &&
                authType === MCPIntegrationAuthType.OAUTH2
            ) {
                return this.integrationsService.createIntegration(
                    organizationId,
                    createIntegrationDto,
                );
            }

            if (!name || !authType || !protocol) {
                throw new Error(
                    'name, authType and protocol are required for custom integrations',
                );
            }

            const validated =
                await this.integrationsService.validateIntegration(
                    createIntegrationDto,
                );

            if (!validated) {
                throw new Error('Failed to validate custom integration');
            }

            return this.integrationsService.createIntegration(
                organizationId,
                createIntegrationDto,
            );
        }

        throw new Error(`Provider type ${providerType} not supported`);
    }

    async createKodusMCPIntegration(
        organizationId: string,
        integrationId: string,
        mcpUrl: string,
    ) {
        const providerType = 'kodusmcp';

        if (!integrationId) {
            throw new Error('integrationId is required in request body');
        }

        const providerInstance = this.providerFactory.getProvider(providerType);
        const integration =
            await providerInstance.getIntegration(integrationId);
        const tools = await providerInstance.getIntegrationTools(
            integrationId,
            organizationId,
        );

        const existingConnection = await this.connectionRepository.findOne({
            where: { integrationId, organizationId, provider: providerType },
        });

        if (existingConnection) {
            return {
                message:
                    'Kodus MCP integration already exists for this organization',
                connection: {
                    id: existingConnection.id,
                    integrationId: existingConnection.integrationId,
                    provider: existingConnection.provider,
                    status: existingConnection.status,
                    appName: existingConnection.appName,
                    mcpUrl: existingConnection.mcpUrl,
                    allowedTools: existingConnection.allowedTools,
                    createdAt: existingConnection.createdAt,
                },
            };
        }

        const allowedTools = tools.map((tool) => tool.slug);
        const resolvedMcpUrl = mcpUrl || integration?.baseUrl || '';

        // Create new connection
        const newConnection = this.connectionRepository.create({
            organizationId,
            integrationId,
            provider: providerType,
            status: MCPConnectionStatus.ACTIVE,
            appName: integration.appName,
            mcpUrl: resolvedMcpUrl,
            allowedTools: allowedTools || [],
            metadata: {
                description: `${providerType} integration for organization`,
                autoCreated: true,
                createdAt: new Date().toISOString(),
            },
        });

        const savedConnection =
            await this.connectionRepository.save(newConnection);

        return {
            message: 'Kodus MCP integration created successfully',
            connection: {
                id: savedConnection.id,
                integrationId: savedConnection.integrationId,
                provider: savedConnection.provider,
                status: savedConnection.status,
                appName: savedConnection.appName,
                mcpUrl: savedConnection.mcpUrl,
                allowedTools: savedConnection.allowedTools,
                createdAt: savedConnection.createdAt,
            },
        };
    }

    async editIntegration(
        organizationId: string,
        providerType: string,
        integrationId: string,
        updateIntegrationDto: CreateIntegrationDto,
    ) {
        if (providerType !== 'custom') {
            throw new Error(
                `Editing integrations is only supported for custom provider type`,
            );
        }

        const validated =
            await this.integrationsService.validateIntegration(
                updateIntegrationDto,
            );

        if (!validated) {
            throw new Error('Failed to validate custom integration');
        }

        return this.integrationsService.editIntegration(
            organizationId,
            integrationId,
            updateIntegrationDto,
        );
    }

    async deleteIntegration(
        organizationId: string,
        providerType: string,
        integrationId: string,
    ) {
        if (providerType !== 'custom') {
            throw new Error(
                `Deleting integrations is only supported for custom provider type`,
            );
        }

        const connections = await this.connectionRepository.find({
            where: { integrationId, organizationId },
        });

        if (connections.length > 0) {
            throw new Error(
                `Cannot delete integration with active connections. Please delete associated connections first.`,
            );
        }

        await this.integrationsService.deleteIntegration(
            organizationId,
            integrationId,
        );

        return { message: 'Integration deleted successfully' };
    }

    async finalizeOAuthIntegration(
        organizationId: string,
        body: FinishOAuthDto,
    ) {
        const { integrationId, code, state } = body;

        if (!integrationId || !code || !state) {
            throw new Error('integrationId, code and state are required');
        }

        const result = await this.integrationsService.finalizeOAuthFlow({
            organizationId,
            integrationId,
            code,
            state,
        });

        return result;
    }
}
