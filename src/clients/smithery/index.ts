import {
    MCPProviderType,
    MCPTool,
} from 'src/modules/providers/interfaces/provider.interface';
import { createMCPAdapter, MCPAdapter } from '@kodus/flow';

export class SmitheryClient {
    private readonly client: MCPAdapter;
    private connected = false;

    constructor(
        private readonly baseUrl: string,
        private readonly protocol: 'http' | 'sse' = 'http',
        private readonly serverName: string,
        private readonly headers?: Record<string, string>,
    ) {
        this.client = createMCPAdapter({
            servers: [
                {
                    name: this.serverName,
                    type: this.protocol,
                    url: this.baseUrl,
                    headers: this.headers,
                },
            ],
        });
    }

    getBaseUrl(): string {
        return this.baseUrl;
    }

    getProtocol(): 'http' | 'sse' {
        return this.protocol;
    }

    private async ensureConnected(): Promise<void> {
        if (this.connected) {
            return;
        }

        await this.client.connect();
        this.connected = true;
    }

    private async ensureDisconnected(): Promise<void> {
        if (!this.connected) {
            return;
        }

        await this.client.disconnect();
        this.connected = false;
    }

    async getTools(): Promise<MCPTool[]> {
        try {
            await this.ensureConnected();
            const tools = await this.client.getTools();
            await this.ensureDisconnected();

            if (!Array.isArray(tools)) {
                throw new Error('Tools endpoint did not return an array');
            }

            return tools.map((tool) => {
                const slug = tool.name;
                return {
                    slug,
                    name: tool.name,
                    description: tool.description,
                    provider: MCPProviderType.SMITHERY,
                    warning: false,
                };
            });
        } catch (error) {
            await this.ensureDisconnected();
            const message = error instanceof Error ? error.message : 'unknown error';
            throw new Error(`Failed to fetch Smithery tools: ${message}`);
        }
    }
}

