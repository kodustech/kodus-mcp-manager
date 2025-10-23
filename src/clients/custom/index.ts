import axios, { AxiosInstance } from 'axios';
import { MCPIntegrationInterface } from 'src/modules/integrations/interfaces/mcp-integration.interface';
import { MCPIntegrationAuthType } from 'src/modules/integrations/enums/integration.enum';
import {
    MCPTool,
    MCPProviderType,
} from 'src/modules/providers/interfaces/provider.interface';
import { createMCPAdapter, MCPAdapter } from '@kodus/flow';

export class CustomClient {
    private readonly clientInstance: MCPAdapter;
    private connected: boolean = false;

    constructor(private readonly integration: MCPIntegrationInterface) {
        this.clientInstance = createMCPAdapter({
            servers: [
                {
                    name: 'custom-server',
                    type: this.integration.protocol,
                    url: this.integration.baseUrl,
                    headers: this.buildHeaders(),
                },
            ],
        });
    }

    private buildHeaders(): Record<string, string> {
        const headers: Record<string, string> = {
            ...this.integration.headers,
        };

        switch (this.integration.authType) {
            case MCPIntegrationAuthType.BEARER_TOKEN:
                headers['Authorization'] =
                    `Bearer ${this.integration.bearerToken}`;
                break;
            case MCPIntegrationAuthType.API_KEY:
                headers[this.integration.apiKeyHeader] =
                    this.integration.apiKey;
                break;
            case MCPIntegrationAuthType.BASIC:
                const basicAuth = Buffer.from(
                    `${this.integration.basicUser}:${this.integration.basicPassword || ''}`,
                ).toString('base64');
                headers['Authorization'] = `Basic ${basicAuth}`;
                break;
            case MCPIntegrationAuthType.NONE:
            default:
                break;
        }

        return headers;
    }

    async connect() {
        if (this.connected) {
            return;
        }
        await this.clientInstance.connect();
        this.connected = true;
    }

    async disconnect() {
        if (!this.connected) {
            return;
        }
        await this.clientInstance.disconnect();
    }

    async getTools(): Promise<MCPTool[]> {
        try {
            await this.connect();
            const response = await this.clientInstance.getTools();
            await this.disconnect();

            if (!Array.isArray(response)) {
                throw new Error('Tools endpoint did not return an array');
            }

            return response.map((tool) => ({
                slug: tool.name,
                name: tool.name,
                description: tool.description,
                provider: MCPProviderType.CUSTOM,
                warning: false,
            }));
        } catch (error) {
            console.error(`Failed to fetch custom tools:`, error.message);
            throw new Error(
                `Failed to fetch tools from custom integration: ${error.message}`,
            );
        }
    }
}
