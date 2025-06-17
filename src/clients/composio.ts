import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

export class ComposioClient {
  private readonly client: AxiosInstance;

  constructor(private configService: ConfigService) {
    this.client = axios.create({
      baseURL: this.configService.get('composio.baseUrl'),
      headers: {
        'x-api-key': this.configService.get('composio.apiKey'),
        'Content-Type': 'application/json',
      },
    });
  }

  private getMCPUrl(serverId: string, authConfigId: string) {
    return `https://mcp.composio.dev/composio/server/${serverId}/mcp?connected_account_id=${authConfigId}`;
  }

  async createMCPServer(
    entityId: string,
    appName: string,
    authConfigId: string,
  ) {
    const name = `${appName}_${entityId.trim().replace(/ /g, '_').substring(0, 25)}`;
    const { data } = await this.client.post('/mcp/servers', {
      name,
      auth_config_ids: [authConfigId],
    });

    return { ...data, mcp_url: this.getMCPUrl(data.id, authConfigId) };
  }

  async getMCPServer(authConfigId: string) {
    const { data } = await this.client.get(`/mcp/servers`, {
      params: { auth_config_ids: authConfigId },
    });

    const items = data.items.map((server) => {
      return {
        ...server,
        mcp_url: this.getMCPUrl(server.id, authConfigId),
      };
    });

    return { ...data, items };
  }
}
