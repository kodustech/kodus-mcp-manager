import { ComposioProvider } from '../../src/modules/providers/composio/composio.provider';
import { ConfigService } from '@nestjs/config';
import { ComposioClient } from '../../src/clients/composio';
import { MCPConnectionStatus } from '../../src/modules/mcp/entities/mcp-connection.entity';

// Mock das dependências
jest.mock('../../src/clients/composio', () => ({
  ComposioClient: jest.fn().mockImplementation(() => ({
    getIntegrations: jest.fn(),
    getIntegration: jest.fn(),
    getTools: jest.fn(),
    getConnectedAccounts: jest.fn(),
    getConnectedAccount: jest.fn(),
    createConnectedAccount: jest.fn(),
    createMCPServer: jest.fn(),
    getMCPServer: jest.fn(),
  })),
}));

describe('ComposioProvider', () => {
  let provider: ComposioProvider;
  let mockConfigService: jest.Mocked<ConfigService>;
  let mockComposioClient: jest.Mocked<ComposioClient>;

  beforeEach(() => {
    // Mock ConfigService
    mockConfigService = {
      get: jest.fn(),
    } as any;

    mockConfigService.get.mockImplementation((key: string) => {
      const config = {
        'composio.apiKey': 'test-api-key',
        'composio.baseUrl': 'https://backend.composio.dev',
        redirectUri: 'https://test.com/callback',
      };
      return config[key];
    });

    // Create provider instance
    provider = new ComposioProvider(mockConfigService);

    // Get the mocked ComposioClient instance
    mockComposioClient = (provider as any).client;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with correct configuration', () => {
      expect(mockConfigService.get).toHaveBeenCalledWith('composio.apiKey');
      expect(mockConfigService.get).toHaveBeenCalledWith('composio.baseUrl');
      expect(mockConfigService.get).toHaveBeenCalledWith('redirectUri');
      expect(ComposioClient).toHaveBeenCalledWith(mockConfigService);
    });
  });

  describe('statusMap', () => {
    it('should have correct status mappings', () => {
      expect(provider.statusMap).toEqual({
        INITIALIZING: MCPConnectionStatus.PENDING,
        INITIATED: MCPConnectionStatus.PENDING,
        ACTIVE: MCPConnectionStatus.ACTIVE,
        FAILED: MCPConnectionStatus.FAILED,
        EXPIRED: MCPConnectionStatus.EXPIRED,
        INACTIVE: MCPConnectionStatus.INACTIVE,
        success: MCPConnectionStatus.ACTIVE,
        error: MCPConnectionStatus.FAILED,
      });
    });
  });

  describe('getIntegrations', () => {
    const mockIntegrationsResponse = {
      items: [
        {
          id: 'auth-config-1',
          name: 'Test Integration',
          auth_scheme: 'OAUTH2',
          toolkit: {
            slug: 'test-app',
            logo: 'https://logo.url',
          },
        },
        {
          id: 'auth-config-2',
          name: 'Another Integration',
          auth_scheme: 'API_KEY',
          toolkit: {
            slug: 'another-app',
            logo: 'https://another-logo.url',
          },
        },
      ],
    };

    it('should return formatted integrations list', async () => {
      mockComposioClient.getIntegrations.mockResolvedValue(
        mockIntegrationsResponse,
      );

      const result = await provider.getIntegrations('cursor', 10, {
        toolkit: 'test',
      });

      expect(mockComposioClient.getIntegrations).toHaveBeenCalledWith({
        limit: 10,
        cursor: 'cursor',
        toolkit: 'test',
      });

      expect(result).toEqual([
        {
          id: 'auth-config-1',
          name: 'Test Integration',
          description: '',
          authScheme: 'OAUTH2',
          appName: 'test-app',
          logo: 'https://logo.url',
          provider: 'composio',
        },
        {
          id: 'auth-config-2',
          name: 'Another Integration',
          description: '',
          authScheme: 'API_KEY',
          appName: 'another-app',
          logo: 'https://another-logo.url',
          provider: 'composio',
        },
      ]);
    });

    it('should handle default parameters', async () => {
      mockComposioClient.getIntegrations.mockResolvedValue({ items: [] });

      await provider.getIntegrations();

      expect(mockComposioClient.getIntegrations).toHaveBeenCalledWith({
        limit: 50,
        cursor: '',
      });
    });
  });

  describe('getIntegration', () => {
    const mockIntegration = {
      id: 'auth-config-1',
      name: 'Test Integration',
      auth_scheme: 'OAUTH2',
      toolkit: {
        slug: 'test-app',
        logo: 'https://logo.url',
      },
    };

    it('should return formatted integration', async () => {
      mockComposioClient.getIntegration.mockResolvedValue(mockIntegration);

      const result = await provider.getIntegration('auth-config-1');

      expect(mockComposioClient.getIntegration).toHaveBeenCalledWith(
        'auth-config-1',
      );

      expect(result).toEqual({
        id: 'auth-config-1',
        name: 'Test Integration',
        description: '',
        authScheme: 'OAUTH2',
        appName: 'test-app',
        logo: 'https://logo.url',
        provider: 'composio',
      });
    });

    it('should validate integration ID', async () => {
      await expect(provider.getIntegration('')).rejects.toThrow(
        'Integration ID is required',
      );
      await expect(provider.getIntegration(null as any)).rejects.toThrow(
        'Integration ID is required',
      );
    });
  });

  describe('getIntegrationRequiredParams', () => {
    const mockIntegration = {
      id: 'auth-config-1',
      expected_input_fields: [
        {
          name: 'apiKey',
          displayName: 'API Key',
          description: 'API Key',
          type: 'string',
          required: true,
        },
        {
          name: 'baseUrl',
          displayName: 'Base URL',
          description: 'Base URL',
          type: 'string',
          required: false,
        },
      ],
    };

    it('should return formatted required parameters', async () => {
      mockComposioClient.getIntegration.mockResolvedValue(mockIntegration);

      const result =
        await provider.getIntegrationRequiredParams('auth-config-1');

      expect(mockComposioClient.getIntegration).toHaveBeenCalledWith(
        'auth-config-1',
      );

      expect(result).toEqual([
        {
          name: 'apiKey',
          displayName: 'API Key',
          description: 'API Key',
          type: 'string',
          required: true,
        },
        {
          name: 'baseUrl',
          displayName: 'Base URL',
          description: 'Base URL',
          type: 'string',
          required: false,
        },
      ]);
    });

    it('should validate integration ID', async () => {
      await expect(provider.getIntegrationRequiredParams('')).rejects.toThrow(
        'Integration ID is required',
      );
    });
  });

  describe('getIntegrationTools', () => {
    const mockIntegration = {
      id: 'auth-config-1',
      toolkit: { slug: 'test-app' },
      restrict_to_following_tools: ['tool1', 'tool2'],
    };

    const mockTools = {
      items: [
        {
          slug: 'tool1',
          name: 'Tool 1',
          description: 'Tool 1 description',
        },
        {
          slug: 'tool2',
          name: 'Tool 2',
          description: 'Tool 2 description',
        },
      ],
    };

    it('should return integration tools', async () => {
      mockComposioClient.getIntegration.mockResolvedValue(mockIntegration);
      mockComposioClient.getTools.mockResolvedValue(mockTools);

      const result = await provider.getIntegrationTools('auth-config-1');

      expect(mockComposioClient.getIntegration).toHaveBeenCalledWith(
        'auth-config-1',
      );
      expect(mockComposioClient.getTools).toHaveBeenCalledWith({
        appName: 'test-app',
        tools: ['tool1', 'tool2'],
      });

      expect(result).toEqual([
        {
          slug: 'tool1',
          name: 'Tool 1',
          description: 'Tool 1 description',
          provider: 'composio',
        },
        {
          slug: 'tool2',
          name: 'Tool 2',
          description: 'Tool 2 description',
          provider: 'composio',
        },
      ]);
    });

    it('should handle empty restrictToFollowingTools', async () => {
      const mockIntegrationEmpty = {
        ...mockIntegration,
        restrict_to_following_tools: undefined,
      };

      mockComposioClient.getIntegration.mockResolvedValue(mockIntegrationEmpty);
      mockComposioClient.getTools.mockResolvedValue(mockTools);

      await provider.getIntegrationTools('auth-config-1');

      expect(mockComposioClient.getTools).toHaveBeenCalledWith({
        appName: 'test-app',
        tools: undefined,
      });
    });

    it('should validate integration ID', async () => {
      await expect(provider.getIntegrationTools('')).rejects.toThrow(
        'Integration ID is required',
      );
    });
  });

  describe('initiateConnection', () => {
    const mockConfig = {
      integrationId: 'auth-config-1',
      organizationId: 'org-1',
      params: { apiKey: 'test-key' },
    };

    const mockIntegration = {
      id: 'auth-config-1',
      name: 'Test Integration',
      auth_scheme: 'OAUTH2',
      toolkit: { slug: 'test-app' },
    };

    const mockConnectionRequest = {
      id: 'conn-1',
      redirect_url: 'https://redirect.url',
      status: 'INITIATED',
    };

    const mockMCPServer = {
      id: 'server-1',
      name: 'test-server',
      auth_config_ids: ['auth-config-1'],
      mcp_url: 'https://mcp.composio.dev/composio/server/server-1/mcp',
    };

    beforeEach(() => {
      mockComposioClient.getIntegration.mockResolvedValue(mockIntegration);
      mockComposioClient.createConnectedAccount.mockResolvedValue(
        mockConnectionRequest,
      );
      mockComposioClient.getMCPServer.mockResolvedValue(mockMCPServer);
    });

    it('should initiate connection successfully', async () => {
      const result = await provider.initiateConnection(mockConfig);

      expect(mockComposioClient.getIntegration).toHaveBeenCalledWith(
        'auth-config-1',
      );
      expect(mockComposioClient.createConnectedAccount).toHaveBeenCalledWith({
        integrationId: 'auth-config-1',
        userId: 'org-1',
        authScheme: 'OAUTH2',
        callbackUrl:
          'https://test.com/callback?provider=composio&integrationId=auth-config-1',
        params: { apiKey: 'test-key' },
      });

      expect(result).toEqual({
        id: 'conn-1',
        authUrl: 'https://redirect.url',
        status: MCPConnectionStatus.PENDING,
        appName: 'test-app',
        mcpUrl:
          'https://mcp.composio.dev/composio/server/server-1/mcp?connected_account_id=conn-1',
      });
    });

    it('should validate required parameters', async () => {
      const mockIntegrationWithParams = {
        ...mockIntegration,
        expected_input_fields: [
          {
            name: 'apiKey',
            displayName: 'API Key',
            description: 'API Key',
            type: 'string',
            required: true,
          },
        ],
      };

      mockComposioClient.getIntegration.mockResolvedValue(
        mockIntegrationWithParams,
      );

      await expect(
        provider.initiateConnection({
          integrationId: 'auth-config-1',
          organizationId: 'org-1',
          params: {},
        }),
      ).rejects.toThrow('Missing required params: apiKey');
    });
  });

  describe('getConnections', () => {
    const mockConnectionsResponse = {
      data: [
        { id: 'conn-1', status: 'ACTIVE' },
        { id: 'conn-2', status: 'PENDING' },
      ],
      total: 2,
    };

    it('should return formatted connections', async () => {
      mockComposioClient.getConnectedAccounts.mockResolvedValue(
        mockConnectionsResponse,
      );

      const result = await provider.getConnections('cursor', 10, {
        integrationId: 'auth-config-1',
        organizationId: 'org-1',
      });

      expect(mockComposioClient.getConnectedAccounts).toHaveBeenCalledWith({
        cursor: 'cursor',
        limit: 10,
        integrationIds: 'auth-config-1',
        appNames: undefined,
      });

      expect(result).toEqual({
        data: [
          { id: 'conn-1', status: 'ACTIVE' },
          { id: 'conn-2', status: 'PENDING' },
        ],
        total: 2,
      });
    });

    it('should handle default parameters', async () => {
      mockComposioClient.getConnectedAccounts.mockResolvedValue({
        data: [],
        total: 0,
      });

      await provider.getConnections();

      expect(mockComposioClient.getConnectedAccounts).toHaveBeenCalledWith({
        cursor: '',
        limit: 10,
        integrationIds: undefined,
        appNames: undefined,
      });
    });
  });

  describe('getConnection', () => {
    const mockConnection = {
      id: 'conn-1',
      status: 'ACTIVE',
      appName: 'test-app',
    };

    it('should return connection details', async () => {
      mockComposioClient.getConnectedAccount.mockResolvedValue(mockConnection);

      const result = await provider.getConnection('conn-1');

      expect(mockComposioClient.getConnectedAccount).toHaveBeenCalledWith(
        'conn-1',
      );

      expect(result).toEqual(mockConnection);
    });
  });

  describe('createMCPServer', () => {
    const mockConfig = {
      integrationId: 'integration-1',
      organizationId: 'org-1',
      appName: 'test-app',
      authConfigId: 'conn-1',
      allowedTools: ['tool1', 'tool2'],
    };

    const mockServerResponse = {
      id: 'server-1',
      name: 'test-app-org-1',
      auth_config_ids: ['integration-1'],
      mcp_url:
        'https://mcp.composio.dev/composio/server/server-1/mcp?connected_account_ids=conn-1',
    };

    it('should create MCP server successfully', async () => {
      mockComposioClient.createMCPServer.mockResolvedValue(mockServerResponse);

      const result = await provider.createMCPServer(mockConfig);

      expect(mockComposioClient.createMCPServer).toHaveBeenCalledWith({
        appName: 'test-app',
        userId: 'org-1',
        integrationId: 'integration-1',
        connectedAccountId: 'conn-1',
        allowedTools: ['tool1', 'tool2'],
      });

      expect(result).toEqual({
        id: 'server-1',
        name: 'test-app-org-1',
        authConfigIds: ['integration-1'],
        mcpUrl:
          'https://mcp.composio.dev/composio/server/server-1/mcp?connected_account_id=conn-1',
      });
    });

    it('should handle config without allowed tools', async () => {
      const configWithoutTools = {
        integrationId: 'integration-1',
        organizationId: 'org-1',
        appName: 'test-app',
        authConfigId: 'conn-1',
      };

      mockComposioClient.createMCPServer.mockResolvedValue(mockServerResponse);

      await provider.createMCPServer(configWithoutTools);

      expect(mockComposioClient.createMCPServer).toHaveBeenCalledWith({
        appName: 'test-app',
        userId: 'org-1',
        integrationId: 'integration-1',
        connectedAccountId: 'conn-1',
        allowedTools: undefined,
      });
    });
  });

  describe('getMCPServer', () => {
    const mockServerResponse = {
      id: 'server-1',
      name: 'test-server',
      auth_config_ids: ['integration-id'],
      mcp_url: 'https://mcp.composio.dev/composio/server/server-1/mcp',
    };

    it('should get MCP server successfully', async () => {
      mockComposioClient.getMCPServer.mockResolvedValue(mockServerResponse);

      const result = await provider.getMCPServer('integration-id');

      expect(mockComposioClient.getMCPServer).toHaveBeenCalledWith(
        'integration-id',
      );

      expect(result).toEqual({
        items: [
          {
            id: 'server-1',
            name: 'test-server',
            auth_config_ids: ['integration-id'],
            mcp_url: 'https://mcp.composio.dev/composio/server/server-1/mcp',
          },
        ],
      });
    });

    it('should validate auth config ID', async () => {
      await expect(provider.getMCPServer('')).rejects.toThrow(
        'Integration ID is required',
      );
    });
  });

  describe('getMCPUrl', () => {
    it('should generate correct MCP URL', () => {
      const url = (provider as any).getMCPUrl('server-1', 'auth-1');
      expect(url).toBe(
        'https://mcp.composio.dev/composio/server/server-1/mcp?connected_account_id=auth-1',
      );
    });
  });
});
