import { MigrationInterface, QueryRunner } from "typeorm";

export class IntegrationProviderType1765221478094 implements MigrationInterface {
    name = 'IntegrationProviderType1765221478094'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TYPE "mcp-manager"."mcp_integrations_provider_enum" AS ENUM('composio', 'kodusmcp', 'custom')
        `);
        await queryRunner.query(`
            ALTER TABLE "mcp-manager"."mcp_integrations"
            ADD "provider" "mcp-manager"."mcp_integrations_provider_enum" NOT NULL DEFAULT 'custom'
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "mcp-manager"."mcp_integrations" DROP COLUMN "provider"
        `);
        await queryRunner.query(`
            DROP TYPE "mcp-manager"."mcp_integrations_provider_enum"
        `);
    }

}
