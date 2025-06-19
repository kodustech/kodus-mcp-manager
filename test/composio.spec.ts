import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { ConfigModule } from '@nestjs/config';
import * as axios from 'axios';
import { ValidationPipe } from '@nestjs/common';

// Mock axios before any imports that might use it
jest.mock('axios');

// Mock composio-core
const mockIntegration = {
  id: 'test-integration-id',
  name: 'Test Integration',
  description: 'Test Description',
  requiredParams: ['param1', 'param2'],
  authScheme: 'OAUTH',
  appName: 'test-app',
};

const mockEntityInstance = {
  initiateConnection: jest.fn().mockResolvedValue({
    id: 'test-connection-request-id',
    url: 'https://test-connection-url.com',
  }),
};

const mockComposioInstance = {
  integrations: {
    list: jest.fn().mockResolvedValue({
      data: [
        {
          id: 'test-integration-id',
          name: 'Test Integration',
          description: 'Test Description',
        },
      ],
      total: 1,
    }),
    get: jest.fn().mockResolvedValue(mockIntegration),
    getRequiredParams: jest.fn().mockResolvedValue(['param1', 'param2']),
  },
  connectedAccounts: {
    list: jest.fn().mockResolvedValue({
      data: [
        {
          id: 'test-connection-id',
          integrationId: 'test-integration-id',
          status: 'active',
        },
      ],
      total: 1,
    }),
    get: jest.fn().mockResolvedValue({
      id: 'test-connection-id',
      integrationId: 'test-integration-id',
      status: 'active',
      authConfig: {
        id: 'test-auth-config',
      },
    }),
  },
};

const mockToolsetInstance = {
  getTools: jest.fn().mockResolvedValue([]),
  getEntity: jest.fn().mockResolvedValue(mockEntityInstance),
};

jest.mock('composio-core', () => ({
  Composio: jest.fn().mockImplementation(() => mockComposioInstance),
  OpenAIToolSet: jest.fn().mockImplementation(() => mockToolsetInstance),
}));

describe('ComposioController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    // Reset all mocks before each test
    jest.clearAllMocks();

    axios.default.create = jest.fn().mockImplementation(() => ({
      post: jest.fn().mockResolvedValue({
        data: {
          id: 'test-mcp-server-id',
          name: 'test-app-test-entity-id',
          auth_config_ids: ['test-auth-config'],
        },
      }),
      get: jest.fn().mockResolvedValue({
        data: {
          items: [
            {
              id: 'test-mcp-server-id',
              name: 'test-app-test-entity-id',
              auth_config_ids: ['test-auth-config'],
            },
          ],
        },
      }),
    }));

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
        }),
        AppModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();

    // Apply validation pipe to test app
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
        transformOptions: {
          enableImplicitConversion: true,
        },
      }),
    );

    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('GET /composio/integrations', () => {
    it('should return list of integrations and call mock with correct parameters', async () => {
      const response = await request(app.getHttpServer())
        .get('/composio/integrations')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data[0]).toHaveProperty('id', 'test-integration-id');

      // Verify mock was called with default parameters
      expect(mockComposioInstance.integrations.list).toHaveBeenCalledWith({
        page: 1,
        pageSize: 10,
      });
    });

    it('should accept query parameters and call mock with correct parameters', async () => {
      await request(app.getHttpServer())
        .get(
          '/composio/integrations?page=2&pageSize=20&integrationName=test-app',
        )
        .expect(200);

      // Verify mock was called with the correct parameters
      expect(mockComposioInstance.integrations.list).toHaveBeenCalledWith({
        page: 2,
        pageSize: 20,
        appName: 'test-app',
      });
    });

    it('should throw validation error when page is less than 1', async () => {
      const response = await request(app.getHttpServer())
        .get('/composio/integrations?page=0')
        .expect(400);

      expect(response.body.message[0]).toContain(
        'page must be a number conforming to the specified constraints',
      );
    });

    it('should throw validation error when pageSize is less than 1', async () => {
      const response = await request(app.getHttpServer())
        .get('/composio/integrations?pageSize=0')
        .expect(400);

      expect(response.body.message[0]).toContain(
        'pageSize must be a number conforming to the specified constraints',
      );
    });

    it('should throw validation error when pageSize is greater than 100', async () => {
      const response = await request(app.getHttpServer())
        .get('/composio/integrations?pageSize=101')
        .expect(400);

      expect(response.body.message[0]).toContain(
        'pageSize must be a number conforming to the specified constraints',
      );
    });
  });

  describe('GET /composio/integrations/:integrationId', () => {
    it('should return integration details and call mock with correct parameters', async () => {
      const integrationId = 'test-integration-id';
      const response = await request(app.getHttpServer())
        .get(`/composio/integrations/${integrationId}`)
        .expect(200);

      expect(response.body).toHaveProperty('id', integrationId);
      expect(response.body).toHaveProperty('name', 'Test Integration');

      // Verify mock was called with correct parameters
      expect(mockComposioInstance.integrations.get).toHaveBeenCalledWith({
        integrationId,
      });
    });
  });

  describe('GET /composio/integrations/:integrationId/required-params', () => {
    it('should return required parameters and call mock with correct parameters', async () => {
      const integrationId = 'test-integration-id';
      const response = await request(app.getHttpServer())
        .get(`/composio/integrations/${integrationId}/required-params`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toContain('param1');
      expect(response.body).toContain('param2');

      // Verify mock was called with correct parameters
      expect(
        mockComposioInstance.integrations.getRequiredParams,
      ).toHaveBeenCalledWith({
        integrationId,
      });
    });
  });

  describe('GET /composio/integrations/:integrationId/tools', () => {
    it('should return integration tools and call mock with correct parameters', async () => {
      const integrationId = 'test-integration-id';
      const mockTools = [
        {
          type: 'function',
          function: {
            name: 'TOOL_NAME',
            description: 'description',
            parameters: {
              description: 'description',
              properties: {
                param1: {
                  description: 'description',
                  title: 'param1',
                  type: 'string',
                },
                recording_id: {
                  description: 'description',
                  title: 'param2',
                  type: 'string',
                },
              },
              required: ['param1', 'param2'],
              title: 'TOOL_NAME_REQUEST',
              type: 'object',
            },
          },
        },
      ];

      // Mock toolset getTools
      mockToolsetInstance.getTools = jest.fn().mockResolvedValue(mockTools);

      const response = await request(app.getHttpServer())
        .get(`/composio/integrations/${integrationId}/tools`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body[0]).toHaveProperty('type', 'function');
      expect(response.body[0].function).toHaveProperty('name', 'TOOL_NAME');

      // Verify mock was called with correct parameters
      expect(mockToolsetInstance.getTools).toHaveBeenCalledWith({
        integrationId,
      });
    });

    it('should throw error when integration is not found', async () => {
      const integrationId = 'non-existent-integration';

      // Mock toolset getTools error
      mockToolsetInstance.getTools = jest
        .fn()
        .mockRejectedValue(new Error('Integration not found'));

      const response = await request(app.getHttpServer())
        .get(`/composio/integrations/${integrationId}/tools`)
        .expect(500);

      expect(response.body.message).toBe('Internal server error');
    });
  });

  describe('POST /composio/mcp-servers', () => {
    it('should create MCP server with allowed tools and call axios with correct parameters', async () => {
      const createMCPServerDto = {
        entityId: 'test-entity-id',
        appName: 'test-app',
        connectedAccountId: 'test-connection-id',
        allowedTools: ['tool1', 'tool2'],
      };

      const mockAxiosInstance = {
        post: jest.fn().mockResolvedValue({
          data: {
            id: 'test-mcp-server-id',
            name: 'test-app-test-entity-id',
            auth_config_ids: ['test-auth-config'],
          },
        }),
      };

      (axios.default.create as jest.Mock).mockReturnValue(mockAxiosInstance);

      const response = await request(app.getHttpServer())
        .post('/composio/mcp-servers')
        .send(createMCPServerDto)
        .expect(201);

      expect(response.body).toHaveProperty('id', 'test-mcp-server-id');

      // Verify axios was called with correct parameters (based on actual implementation)
      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/mcp/servers', {
        name: 'test-app-test-entity-id',
        auth_config_ids: ['test-auth-config'],
        allowed_tools: ['tool1', 'tool2'],
      });
    });

    it('should create MCP server without allowed tools', () => {
      const createMCPServerDto = {
        entityId: 'test-entity-id',
        appName: 'test-app',
        connectedAccountId: 'test-connection-id',
      };

      const mcpUrl = `https://mcp.composio.dev/composio/server/test-mcp-server-id/mcp?connected_account_id=test-auth-config`;

      return request(app.getHttpServer())
        .post('/composio/mcp-servers')
        .send(createMCPServerDto)
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id', 'test-mcp-server-id');
          expect(res.body).toHaveProperty('mcp_url');
          expect(res.body.mcp_url).toBe(mcpUrl);
        });
    });

    it('should throw validation error when required fields are missing', async () => {
      const createMCPServerDto = {
        entityId: 'test-entity-id',
        // Missing appName and connectedAccountId
      };

      const response = await request(app.getHttpServer())
        .post('/composio/mcp-servers')
        .send(createMCPServerDto)
        .expect(400);

      expect(response.body.message).toContain('appName must be a string');
      expect(response.body.message).toContain(
        'connectedAccountId must be a string',
      );
    });

    it('should throw validation error when allowedTools contains non-string values', async () => {
      const createMCPServerDto = {
        entityId: 'test-entity-id',
        appName: 'test-app',
        connectedAccountId: 'test-connection-id',
        allowedTools: [123, 'tool2'],
      };

      const response = await request(app.getHttpServer())
        .post('/composio/mcp-servers')
        .send(createMCPServerDto)
        .expect(400);

      expect(response.body.message).toContain(
        'each value in allowedTools must be a string',
      );
    });
  });

  describe('GET /composio/mcp-servers/:authConfigId', () => {
    it('should get MCP server and call axios with correct parameters', async () => {
      const authConfigId = 'test-auth-config';

      const mockAxiosInstance = {
        get: jest.fn().mockResolvedValue({
          data: {
            items: [
              {
                id: 'test-mcp-server-id',
                name: 'test-app-test-entity-id',
                auth_config_ids: ['test-auth-config'],
              },
            ],
          },
        }),
      };

      (axios.default.create as jest.Mock).mockReturnValue(mockAxiosInstance);

      const response = await request(app.getHttpServer())
        .get(`/composio/mcp-servers/${authConfigId}`)
        .expect(200);

      expect(response.body).toHaveProperty('items');
      expect(response.body.items[0]).toHaveProperty('id', 'test-mcp-server-id');

      // Verify axios was called with correct parameters (based on actual implementation)
      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/mcp/servers', {
        params: { auth_config_ids: authConfigId },
      });
    });
  });

  describe('GET /composio/connections', () => {
    it('should return list of connections and call mock with correct parameters', async () => {
      const response = await request(app.getHttpServer())
        .get('/composio/connections')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data[0]).toHaveProperty('id', 'test-connection-id');

      // Verify mock was called with correct parameters
      expect(mockComposioInstance.connectedAccounts.list).toHaveBeenCalledWith({
        integrationId: undefined,
        entityId: undefined,
        page: 1,
        pageSize: 10,
      });
    });

    it('should accept query parameters and call mock with correct parameters', async () => {
      await request(app.getHttpServer())
        .get(
          '/composio/connections?page=2&pageSize=15&integrationId=test-id&entityId=test-entity&integrationName=test-app',
        )
        .expect(200);

      // Verify mock was called with correct parameters
      expect(mockComposioInstance.connectedAccounts.list).toHaveBeenCalledWith({
        integrationId: 'test-id',
        entityId: 'test-entity',
        page: 2,
        pageSize: 15,
        appNames: 'test-app',
      });
    });
  });

  describe('POST /composio/initiate-connection', () => {
    it('should initiate connection with OAuth and call mocks with correct parameters', async () => {
      const initiateConnectionDto = {
        integrationId: 'test-integration-id',
        entityId: 'test-entity-id',
      };

      const response = await request(app.getHttpServer())
        .post('/composio/initiate-connection')
        .send(initiateConnectionDto)
        .expect(201);

      expect(response.body).toHaveProperty('id', 'test-connection-request-id');
      expect(response.body).toHaveProperty(
        'url',
        'https://test-connection-url.com',
      );

      // Verify integration was fetched with correct parameters
      expect(mockComposioInstance.integrations.get).toHaveBeenCalledWith({
        integrationId: 'test-integration-id',
      });

      // Verify entity was fetched with correct parameters
      expect(mockToolsetInstance.getEntity).toHaveBeenCalledWith(
        'test-entity-id',
      );

      // Verify initiateConnection was called with correct parameters
      expect(mockEntityInstance.initiateConnection).toHaveBeenCalledWith({
        integrationId: 'test-integration-id',
        redirectUri: undefined,
        appName: 'test-app',
        authMode: 'OAUTH',
      });
    });

    it('should initiate connection with API_KEY and call mocks with correct parameters', async () => {
      const initiateConnectionDto = {
        integrationId: 'test-integration-id',
        entityId: 'test-entity-id',
        apiKey: 'test-api-key',
      };

      // Update mock integration for API_KEY test
      mockComposioInstance.integrations.get.mockResolvedValueOnce({
        ...mockIntegration,
        authScheme: 'API_KEY',
      });

      const response = await request(app.getHttpServer())
        .post('/composio/initiate-connection')
        .send(initiateConnectionDto)
        .expect(201);

      expect(response.body).toHaveProperty('id', 'test-connection-request-id');

      // Verify initiateConnection was called with API key parameters
      expect(mockEntityInstance.initiateConnection).toHaveBeenCalledWith({
        integrationId: 'test-integration-id',
        redirectUri: undefined,
        connectionParams: {
          apiKey: 'test-api-key',
        },
        appName: 'test-app',
        authMode: 'API_KEY',
      });
    });

    it('should throw validation error when required fields are missing', async () => {
      const initiateConnectionDto = {
        // Missing integrationId and entityId
      };

      const response = await request(app.getHttpServer())
        .post('/composio/initiate-connection')
        .send(initiateConnectionDto)
        .expect(400);

      expect(response.body.message).toContain('integrationId must be a string');
      expect(response.body.message).toContain('entityId must be a string');
    });

    it('should throw validation error when fields are not strings', async () => {
      // Since enableImplicitConversion is true, numbers will be converted to strings
      // So we need to test with values that cannot be converted to valid strings
      const invalidDto = {
        integrationId: null,
        entityId: undefined,
      };

      const response = await request(app.getHttpServer())
        .post('/composio/initiate-connection')
        .send(invalidDto)
        .expect(400);

      expect(response.body.message).toContain('integrationId must be a string');
      expect(response.body.message).toContain('entityId must be a string');
    });
  });
});
