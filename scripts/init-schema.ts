import { DataSource } from 'typeorm';
import { getTypeOrmConfig } from '../src/config/typeorm.config';

async function initSchema() {
    const config = getTypeOrmConfig();

    // Create a new data source without the schema property
    // so it connects to the default schema (public) first
    const initConfig = { ...config };
    delete (initConfig as any).schema;

    const dataSource = new DataSource(initConfig as any);

    try {
        await dataSource.initialize();
        console.log('Connected to database to ensure schema exists...');

        // Use the schema name defined in the original config
        const schemaName = (config as any).schema || 'mcp-manager';

        if (!/^[a-zA-Z0-9_-]+$/.test(schemaName)) {
            throw new Error(`Invalid schema name: "${schemaName}"`);
        }

        await dataSource.query(`CREATE SCHEMA IF NOT EXISTS "${schemaName}"`);

        console.log(`Schema "${schemaName}" is ready.`);
    } catch (error) {
        console.error('Error ensuring schema:', error);
        process.exit(1);
    } finally {
        if (dataSource.isInitialized) {
            await dataSource.destroy();
        }
    }
}

initSchema();
