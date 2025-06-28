import { ComposioProvider } from '../../src/modules/providers/composio/composio.provider';
import { ConfigService } from '@nestjs/config';
import { Composio } from '@composio/core';
import axios from 'axios';
import { MCPConnectionStatus } from '../../src/modules/mcp/entities/mcp-connection.entity';

// Mock das dependências
jest.mock('axios');

describe('ComposioProvider', () => {
  let provider: ComposioProvider;
  let mockConfigService: jest.Mocked<ConfigService>;
  let mockComposio: any;
  let mockAxiosInstance: jest.Mocked<any>;

  beforeEach(() => {
    // Mock ConfigService
    mockConfigService = {
      get: jest.fn(),
    } as any;

    mockConfigService.get.mockImplementation((key: string) => {
      const config = {
        'composio.apiKey': 'test-api-key',
        'composio.baseUrl': 'https://api.composio.dev',
        redirectUri: 'https://test.com/callback',
      };
      return config[key];
    });

    // Mock Axios instance
    mockAxiosInstance = {
      post: jest.fn(),
      get: jest.fn(),
    };
    (axios.create as jest.Mock).mockReturnValue(mockAxiosInstance);

    // Create a new instance to get fresh mocks
    provider = new ComposioProvider(mockConfigService);

    // Get the mock instance created by the constructor
    mockComposio = (provider as any).composio;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with correct configuration', () => {
      expect(mockConfigService.get).toHaveBeenCalledWith('composio.apiKey');
      expect(mockConfigService.get).toHaveBeenCalledWith('composio.baseUrl');
      expect(mockConfigService.get).toHaveBeenCalledWith('redirectUri');
      expect(Composio).toHaveBeenCalledWith({
        apiKey: 'test-api-key',
        baseURL: 'https://backend.composio.dev',
      });
      expect(axios.create).toHaveBeenCalledWith({
        baseURL: 'https://api.composio.dev',
        headers: {
          'x-api-key': 'test-api-key',
          'Content-Type': 'application/json',
        },
      });
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
          authScheme: 'OAUTH2',
          toolkit: {
            slug: 'test-app',
            logo: 'https://logo.url',
          },
        },
        {
          id: 'auth-config-2',
          name: 'Another Integration',
          authScheme: 'API_KEY',
          toolkit: {
            slug: 'another-app',
            logo: 'https://another-logo.url',
          },
        },
      ],
    };

    it('should return formatted integrations list', async () => {
      mockComposio.authConfigs.list.mockResolvedValue(mockIntegrationsResponse);

      const result = await provider.getIntegrations('cursor', 10, {
        toolkit: 'test',
      });

      expect(mockComposio.authConfigs.list).toHaveBeenCalledWith({
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
      mockComposio.authConfigs.list.mockResolvedValue({ items: [] });

      await provider.getIntegrations();

      expect(mockComposio.authConfigs.list).toHaveBeenCalledWith({
        limit: 50,
        cursor: '',
        toolkit: undefined,
      });
    });
  });

  describe('getIntegration', () => {
    const mockIntegration = {
      id: 'auth-config-1',
      name: 'Test Integration',
      authScheme: 'OAUTH2',
      toolkit: {
        slug: 'test-app',
        logo: 'https://logo.url',
      },
    };

    it('should return formatted integration', async () => {
      mockComposio.authConfigs.get.mockResolvedValue(mockIntegration);

      const result = await provider.getIntegration('auth-config-1');

      expect(mockComposio.authConfigs.get).toHaveBeenCalledWith(
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
      expectedInputFields: [
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
      mockComposio.authConfigs.get.mockResolvedValue(mockIntegration);

      const result =
        await provider.getIntegrationRequiredParams('auth-config-1');

      expect(mockComposio.authConfigs.get).toHaveBeenCalledWith(
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
      restrictToFollowingTools: ['tool1', 'tool2'],
    };

    const mockTools = [
      {
        type: 'function',
        function: { name: 'tool1', description: 'Tool 1' },
      },
      {
        type: 'action',
        action: { name: 'tool2', description: 'Tool 2' },
      },
    ];

    it('should return integration tools', async () => {
      mockComposio.authConfigs.get.mockResolvedValue(mockIntegration);
      mockComposio.tools.get.mockResolvedValue(mockTools);

      const result = await provider.getIntegrationTools(
        'auth-config-1',
        'org-1',
      );

      expect(mockComposio.authConfigs.get).toHaveBeenCalledWith(
        'auth-config-1',
      );
      expect(mockComposio.tools.get).toHaveBeenCalledWith('org-1', {
        toolkits: ['test-app'],
        limit: 3,
      });

      expect(result).toEqual([
        {
          type: 'function',
          name: 'tool1',
          description: 'Tool 1',
          provider: 'composio',
        },
        {
          type: 'action',
          name: 'tool2',
          description: 'Tool 2',
          provider: 'composio',
        },
      ]);
    });

    it('should handle empty restrictToFollowingTools', async () => {
      const mockIntegrationEmpty = {
        ...mockIntegration,
        restrictToFollowingTools: [],
      };

      mockComposio.authConfigs.get.mockResolvedValue(mockIntegrationEmpty);
      mockComposio.tools.get.mockResolvedValue(mockTools);

      await provider.getIntegrationTools('auth-config-1', 'org-1');

      expect(mockComposio.tools.get).toHaveBeenCalledWith('org-1', {
        tools: [],
      });
    });

    it('should validate integration ID', async () => {
      await expect(provider.getIntegrationTools('', 'org-1')).rejects.toThrow(
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

    const mockConnectionRequest = {
      id: 'conn-1',
      redirectUrl: 'https://redirect.url',
      status: 'INITIATED',
    };

    beforeEach(() => {
      jest.spyOn(provider, 'getIntegration').mockResolvedValue({
        id: 'auth-config-1',
        name: 'Test Integration',
        description: '',
        authScheme: 'OAUTH2',
        appName: 'test-app',
        provider: 'composio',
      });
      jest
        .spyOn(provider, 'getIntegrationRequiredParams')
        .mockResolvedValue([]);
      mockComposio.connectedAccounts.initiate.mockResolvedValue(
        mockConnectionRequest,
      );
    });

    it('should initiate connection successfully', async () => {
      // Mock the authSchemaMap function
      const mockAuthSchema = jest.fn().mockReturnValue({ config: 'test' });
      jest.doMock('../../src/modules/providers/composio/auth-schema', () => ({
        authSchemaMap: {
          OAUTH2: mockAuthSchema,
        },
      }));

      const result = await provider.initiateConnection(mockConfig);

      expect(provider.getIntegrationRequiredParams).toHaveBeenCalledWith(
        'auth-config-1',
      );
      expect(provider.getIntegration).toHaveBeenCalledWith('auth-config-1');

      expect(result).toEqual({
        id: 'conn-1',
        url: 'https://redirect.url',
        status: MCPConnectionStatus.PENDING,
      });
    });

    it('should validate required parameters', async () => {
      const requiredParams = [
        {
          name: 'apiKey',
          displayName: 'API Key',
          description: 'API Key',
          type: 'string',
          required: true,
        },
      ];
      jest
        .spyOn(provider, 'getIntegrationRequiredParams')
        .mockResolvedValue(requiredParams);

      await expect(
        provider.initiateConnection({
          integrationId: 'auth-config-1',
          organizationId: 'org-1',
          params: {},
        }),
      ).rejects.toThrow('Required parameter "apiKey" is required');
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
      mockComposio.connectedAccounts.list.mockResolvedValue(
        mockConnectionsResponse,
      );

      const result = await provider.getConnections(1, 10, {
        integrationId: 'auth-config-1',
        organizationId: 'org-1',
      });

      expect(mockComposio.connectedAccounts.list).toHaveBeenCalledWith({
        cursor: 1,
        limit: 10,
        authConfigIds: 'auth-config-1',
        userIds: 'org-1',
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
      mockComposio.connectedAccounts.list.mockResolvedValue({
        data: [],
        total: 0,
      });

      await provider.getConnections();

      expect(mockComposio.connectedAccounts.list).toHaveBeenCalledWith({
        cursor: 1,
        limit: 10,
        authConfigIds: undefined,
        userIds: undefined,
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
      mockComposio.connectedAccounts.get.mockResolvedValue(mockConnection);

      const result = await provider.getConnection('conn-1');

      expect(mockComposio.connectedAccounts.get).toHaveBeenCalledWith('conn-1');

      expect(result).toEqual(mockConnection);
    });
  });

  describe('createMCPServer', () => {
    const mockConfig = {
      organizationId: 'org-1',
      appName: 'test-app',
      authConfigId: 'auth-1',
      allowedTools: ['tool1', 'tool2'],
    };

    const mockServerResponse = {
      data: {
        id: 'server-1',
        name: 'test-app-org-1',
        auth_config_ids: ['auth-1'],
      },
    };

    it('should create MCP server successfully', async () => {
      mockAxiosInstance.post.mockResolvedValue(mockServerResponse);

      const result = await provider.createMCPServer(mockConfig);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/mcp/servers', {
        name: 'test-app-org-1',
        auth_config_ids: ['auth-1'],
        allowed_tools: ['tool1', 'tool2'],
      });

      expect(result).toEqual({
        id: 'server-1',
        name: 'test-app-org-1',
        authConfigIds: ['auth-1'],
        mcpUrl:
          'https://mcp.composio.dev/composio/server/server-1/mcp?connected_account_id=auth-1',
      });
    });

    it('should handle config without allowed tools', async () => {
      const configWithoutTools = { ...mockConfig };
      delete configWithoutTools.allowedTools;

      mockAxiosInstance.post.mockResolvedValue(mockServerResponse);

      await provider.createMCPServer(configWithoutTools);

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/mcp/servers', {
        name: 'test-app-org-1',
        auth_config_ids: ['auth-1'],
        allowed_tools: undefined,
      });
    });
  });

  describe('getMCPServer', () => {
    const mockServerResponse = {
      data: {
        items: [
          {
            id: 'server-1',
            name: 'test-server',
            auth_config_ids: ['auth-1'],
          },
        ],
      },
    };

    it('should get MCP server successfully', async () => {
      mockAxiosInstance.get.mockResolvedValue(mockServerResponse);

      const result = await provider.getMCPServer('auth-1');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/mcp/servers', {
        params: { auth_config_ids: 'auth-1' },
      });

      expect(result).toEqual({
        items: [
          {
            id: 'server-1',
            name: 'test-server',
            auth_config_ids: ['auth-1'],
            mcp_url:
              'https://mcp.composio.dev/composio/server/server-1/mcp?connected_account_id=auth-1',
          },
        ],
      });
    });

    it('should validate auth config ID', async () => {
      await expect(provider.getMCPServer('')).rejects.toThrow(
        'Auth Config ID is required',
      );
    });
  });

  describe('installIntegration', () => {
    const mockInstallData = {
      apiKey: 'test-key',
      allowedTools: ['tool1', 'tool2'],
    };

    const mockConnection = {
      id: 'conn-1',
      status: 'ACTIVE',
      appName: 'test-app',
      authConfig: { id: 'auth-1' },
    };

    const mockServer = {
      id: 'server-1',
      name: 'test-server',
      authConfigIds: ['auth-1'],
      mcpUrl: 'https://mcp.url',
    };

    beforeEach(() => {
      jest.spyOn(provider, 'initiateConnection').mockResolvedValue({
        id: 'conn-1',
        url: 'https://redirect.url',
        status: MCPConnectionStatus.ACTIVE,
      });
      jest
        .spyOn(provider, 'getConnection')
        .mockResolvedValue(mockConnection as any);
      jest.spyOn(provider, 'createMCPServer').mockResolvedValue(mockServer);
    });

    it('should install integration successfully', async () => {
      const result = await provider.installIntegration(
        'auth-config-1',
        'org-1',
        mockInstallData,
      );

      expect(provider.initiateConnection).toHaveBeenCalledWith({
        integrationId: 'auth-config-1',
        organizationId: 'org-1',
        params: { apiKey: 'test-key' },
      });

      expect(provider.getConnection).toHaveBeenCalledWith('conn-1');

      expect(provider.createMCPServer).toHaveBeenCalledWith({
        organizationId: 'org-1',
        appName: 'test-app',
        authConfigId: 'auth-1',
        allowedTools: ['tool1', 'tool2'],
      });

      expect(result).toEqual({
        server: {
          id: 'server-1',
          name: 'test-server',
          authConfigIds: ['auth-1'],
          mcpUrl: 'https://mcp.url',
          appName: 'test-app',
        },
        connection: {
          id: 'conn-1',
          authId: 'auth-1',
          status: MCPConnectionStatus.ACTIVE,
          url: 'https://redirect.url',
        },
      });
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
