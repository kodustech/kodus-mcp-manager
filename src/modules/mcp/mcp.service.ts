import { Injectable, NotFoundException } from '@nestjs/common';
import { ProviderFactory } from '../providers/provider.factory';
import { QueryDto } from './dto/query.dto';
// import { InitiateConnectionDto } from './dto/initiate-connection.dto';
import { MCPConnectionEntity } from './entities/mcp-connection.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MCPInstallIntegrationDto } from './dto/mcp-install.dto';

@Injectable()
export class McpService {
  constructor(
    private providerFactory: ProviderFactory,
    @InjectRepository(MCPConnectionEntity)
    private connectionRepository: Repository<MCPConnectionEntity>,
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

  getConnection(connectionId: string) {
    return this.connectionRepository.findOne({
      where: { id: connectionId },
    });
  }

  async getIntegrations(query: QueryDto, organizationId: string) {
    const promises = this.providerFactory.getProviders().map((provider) => {
      const { page, pageSize, appName } = query;
      return provider.getIntegrations(String(page), pageSize, { appName });
    });

    const integrations = (await Promise.all(promises)).flat();
    const connections = await this.connectionRepository.find({
      where: { organizationId },
    });
    return integrations.map((integration) => {
      const connection = connections.find(
        (connection) => connection.integrationId === integration.id,
      );
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

  async installIntegration(
    integrationId: string,
    organizationId: string,
    providerType: string,
    body: MCPInstallIntegrationDto & { [key: string]: any },
  ) {
    const provider = this.providerFactory.getProvider(providerType);
    const response = await provider.installIntegration(
      integrationId,
      organizationId,
      body,
    );

    const connection = await this.connectionRepository.findOne({
      where: { integrationId, organizationId },
    });

    const newConnection = Object.assign(connection || {}, {
      integrationId,
      organizationId,
      status: response.connection.status,
      provider: providerType,
      mcpUrl: response.server.mcpUrl,
      appName: response.server.appName,
      metadata: response,
    });

    this.connectionRepository.save(newConnection);

    return {
      provider: providerType,
      status: response.connection.status,
      authUrl: response.connection.url,
      mcpUrl: response.server.mcpUrl,
    };
  }

  async updateIntegration(body: any, organizationId: string) {
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
        connection: {
          ...connection.metadata.connection,
          status: provider.statusMap[body.status],
        },
      },
    });

    await this.connectionRepository.save(updatedConnection);

    return updatedConnection;
  }
}
