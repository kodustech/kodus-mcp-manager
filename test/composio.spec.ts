import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { ConfigModule } from '@nestjs/config';
import * as axios from 'axios';

// Mock axios before any imports that might use it
jest.mock('axios');

// Mock composio-core
jest.mock('composio-core', () => ({
  Composio: jest.fn().mockImplementation(() => ({
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
      get: jest.fn().mockResolvedValue({
        id: 'test-integration-id',
        name: 'Test Integration',
        description: 'Test Description',
        requiredParams: ['param1', 'param2'],
      }),
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
    },
  })),
  OpenAIToolSet: jest.fn().mockImplementation(() => ({
    getEntity: jest.fn().mockResolvedValue({
      initiateConnection: jest.fn().mockResolvedValue({
        id: 'test-connection-request-id',
        url: 'https://test-connection-url.com',
      }),
    }),
  })),
}));

describe('ComposioController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    axios.default.create = jest.fn().mockImplementation(() => ({
      post: jest.fn().mockResolvedValue({
        data: {
          id: 'test-mcp-server-id',
          name: 'test-app_test-entity-id',
          auth_config_ids: ['test-auth-config'],
        },
      }),
      get: jest.fn().mockResolvedValue({
        data: {
          items: [
            {
              id: 'test-mcp-server-id',
              name: 'test-app_test-entity-id',
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
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('GET /composio/integrations', () => {
    it('should return list of integrations', () => {
      return request(app.getHttpServer())
        .get('/composio/integrations')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('data');
          expect(Array.isArray(res.body.data)).toBe(true);
          expect(res.body.data[0]).toHaveProperty('id', 'test-integration-id');
        });
    });

    it('should accept query parameters', () => {
      return request(app.getHttpServer())
        .get('/composio/integrations?page=1&pageSize=10&integrationName=test')
        .expect(200);
    });
  });

  describe('GET /composio/integrations/:integrationId', () => {
    it('should return integration details', () => {
      const integrationId = 'test-integration-id';
      return request(app.getHttpServer())
        .get(`/composio/integrations/${integrationId}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('id', integrationId);
          expect(res.body).toHaveProperty('name', 'Test Integration');
        });
    });
  });

  describe('GET /composio/integrations/:integrationId/required-params', () => {
    it('should return required parameters for integration', () => {
      const integrationId = 'test-integration-id';
      return request(app.getHttpServer())
        .get(`/composio/integrations/${integrationId}/required-params`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body).toContain('param1');
          expect(res.body).toContain('param2');
        });
    });
  });

  describe('POST /composio/mcp-servers', () => {
    it('should create MCP server', () => {
      const createMCPServerDto = {
        entityId: 'test-entity-id',
        appName: 'test-app',
        authConfigId: 'test-auth-config',
      };

      const mcpUrl = `https://mcp.composio.dev/composio/server/test-mcp-server-id/mcp?connected_account_id=${createMCPServerDto.authConfigId}`;

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
  });

  describe('GET /composio/mcp-servers/:authConfigId', () => {
    it('should get MCP server', async () => {
      const authConfigId = 'test-auth-config';

      const result = await request(app.getHttpServer()).get(
        `/composio/mcp-servers/${authConfigId}`,
      );

      const mcpUrl = `https://mcp.composio.dev/composio/server/test-mcp-server-id/mcp?connected_account_id=${authConfigId}`;
      expect(result.status).toBe(200);
      expect(result.body).toHaveProperty('items');
      expect(result.body.items[0]).toHaveProperty('mcp_url', mcpUrl);
    });
  });

  describe('GET /composio/connections', () => {
    it('should return list of connections', () => {
      return request(app.getHttpServer())
        .get('/composio/connections')
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('data');
          expect(Array.isArray(res.body.data)).toBe(true);
          expect(res.body.data[0]).toHaveProperty('id', 'test-connection-id');
        });
    });

    it('should accept query parameters', () => {
      return request(app.getHttpServer())
        .get('/composio/connections?page=1&pageSize=10&integrationId=test-id')
        .expect(200);
    });
  });

  describe('POST /composio/initiate-connection', () => {
    it('should initiate connection', () => {
      const initiateConnectionDto = {
        integrationId: 'test-integration-id',
        entityId: 'test-entity-id',
      };

      return request(app.getHttpServer())
        .post('/composio/initiate-connection')
        .send(initiateConnectionDto)
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id', 'test-connection-request-id');
          expect(res.body).toHaveProperty(
            'url',
            'https://test-connection-url.com',
          );
        });
    });
  });
});
