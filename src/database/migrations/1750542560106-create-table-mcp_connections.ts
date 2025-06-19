import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTableMcpConnections1750542560106
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
        CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

        CREATE TABLE public.mcp_connections (
            id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
            "organizationId" character varying NOT NULL,
            "integrationId" character varying(50) NULL,
            status character varying(30) NOT NULL DEFAULT 'pending',
            provider character varying(30) NOT NULL,
            "appName" character varying(30) NOT NULL,
            "mcpUrl" character varying(255),
            metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
            "createdAt" timestamp DEFAULT now(),
            "updatedAt" timestamp DEFAULT now(),
            "deletedAt" timestamp DEFAULT null
        );

        CREATE INDEX idx_mcp_connections_organization_id ON public.mcp_connections ("organizationId");
        CREATE INDEX idx_mcp_connections_integration_id ON public.mcp_connections ("integrationId");
        CREATE INDEX idx_mcp_connections_org_integration ON public.mcp_connections ("organizationId", "integrationId");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "mcp_connections"`);
  }
}
