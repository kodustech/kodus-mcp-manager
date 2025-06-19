import { BadRequestException } from '@nestjs/common';
import {
  MCPProvider,
  MCPConnectionConfig,
  MCPIntegration,
  MCPConnection,
  MCPRequiredParam,
  MCPInstallIntegration,
  MCPInstallIntegrationResponse,
} from './interfaces/provider.interface';
import { MCPConnectionStatus } from '../mcp/entities/mcp-connection.entity';

export abstract class BaseProvider implements MCPProvider {
  abstract statusMap: Record<string, MCPConnectionStatus>;
  abstract getIntegrations(
    page?: number,
    pageSize?: number,
    filters?: Record<string, any>,
  ): Promise<MCPIntegration[]>;

  abstract getIntegration(integrationId: string): Promise<MCPIntegration>;

  abstract getIntegrationRequiredParams(
    integrationId: string,
  ): Promise<MCPRequiredParam[]>;

  abstract getIntegrationTools(integrationId: string): Promise<any[]>;

  abstract initiateConnection(
    config: MCPConnectionConfig,
  ): Promise<MCPConnection>;

  abstract getConnections(
    page?: number,
    pageSize?: number,
    filters?: Record<string, any>,
  ): Promise<{ data: MCPConnection[]; total: number }>;

  abstract installIntegration(
    integrationId: string,
    organizationId: string,
    data: MCPInstallIntegration,
  ): Promise<MCPInstallIntegrationResponse>;

  protected validateId(id: string, name: string): void {
    if (!id) {
      throw new BadRequestException(`${name} ID is required`);
    }
  }

  protected buildRedirectUri(
    redirectUri: string,
    params: Record<string, any>,
  ): string {
    if (!redirectUri) return undefined;
    const queryParams = new URLSearchParams(params);
    return `${redirectUri}?${queryParams.toString()}`;
  }
}
