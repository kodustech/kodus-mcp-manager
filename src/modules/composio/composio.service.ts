import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import {
  Composio,
  ConnectedAccountsListData,
  InitiateConnectionDataReq,
  IntegrationListParam,
  OpenAIToolSet,
} from 'composio-core';
import { QueryDto } from './dto/query.dto';
import { CreateMCPServerDto } from './dto/create-mcp.dto';
import { ComposioClient } from '../../clients/composio';
import { InitiateConnectionDto } from './dto/initiate-connection.dto';

@Injectable()
export class ComposioService {
  private readonly composio: Composio;
  private readonly toolset: OpenAIToolSet;

  constructor(private configService: ConfigService) {
    this.composio = new Composio({
      apiKey: this.configService.get('composio.apiKey'),
    });
    this.toolset = new OpenAIToolSet({
      apiKey: this.configService.get('composio.apiKey'),
    });
  }

  async getIntegrations(query: QueryDto) {
    const params: IntegrationListParam = {
      page: query.page,
      pageSize: query.pageSize,
    };

    if (query.integrationName) params.appName = query.integrationName;

    return this.composio.integrations.list(params);
  }

  getIntegration(integrationId: string) {
    if (!integrationId) {
      throw new BadRequestException('Integration ID is required');
    }

    return this.composio.integrations.get({ integrationId });
  }

  getIntegrationRequiredParams(integrationId: string) {
    if (!integrationId) {
      throw new BadRequestException('Integration ID is required');
    }

    return this.composio.integrations.getRequiredParams({ integrationId });
  }

  getConnections(query: QueryDto) {
    const params: ConnectedAccountsListData = {
      integrationId: query.integrationId,
      entityId: query.entityId,
      page: query.page,
      pageSize: query.pageSize,
    };

    if (query.integrationName) params.appNames = query.integrationName;

    return this.composio.connectedAccounts.list(params);
  }

  async initiateConnection(body: InitiateConnectionDto) {
    const { integrationId, entityId } = body;

    const params: InitiateConnectionDataReq = {
      integrationId,
      redirectUri: this.configService.get('redirectUri', undefined),
    };

    const integration = await this.getIntegration(integrationId);
    if (integration.authScheme === 'API_KEY') {
      if (!body.apiKey) {
        throw new BadRequestException('API key is required');
      }

      params.connectionParams = {
        apiKey: body.apiKey,
      };
    }

    params.appName = integration.appName;
    params.authMode = integration.authScheme as any;

    const entity = await this.toolset.getEntity(entityId);
    const connectionRequest = await entity.initiateConnection(params);

    return connectionRequest;
  }

  async createMCPServer(body: CreateMCPServerDto) {
    const { entityId, appName, authConfigId } = body;

    const client = new ComposioClient(this.configService);
    const mcpServer = await client.createMCPServer(
      entityId,
      appName,
      authConfigId,
    );

    return mcpServer;
  }

  async getMCPServer(authConfigId: string) {
    const client = new ComposioClient(this.configService);
    const mcpServer = await client.getMCPServer(authConfigId);

    return mcpServer;
  }
}
