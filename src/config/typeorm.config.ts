import * as dotenv from 'dotenv';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { DataSource, DataSourceOptions } from 'typeorm';

dotenv.config();

const requiredEnvVars = [
    'API_PG_DB_HOST',
    'API_PG_DB_PORT',
    'API_PG_DB_USERNAME',
    'API_PG_DB_PASSWORD',
    'API_PG_DB_DATABASE',
];

for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
        throw new Error(
            `Variável de ambiente obrigatória não encontrada: ${envVar}`,
        );
    }
}

const isProduction =
    process.env.API_MCP_MANAGER_NODE_ENV === 'production' ||
    process.env.API_MCP_MANAGER_DATABASE_ENV === 'production';

const sslConfig = isProduction ? { rejectUnauthorized: false } : false;

const dataSourceConfig: DataSourceOptions = {
    type: 'postgres',
    host: process.env.API_PG_DB_HOST,
    port: parseInt(process.env.API_PG_DB_PORT),
    username: process.env.API_PG_DB_USERNAME,
    password: process.env.API_PG_DB_PASSWORD,
    database: process.env.API_PG_DB_DATABASE,
    schema: 'mcp-manager',
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    migrations: [__dirname + '/../database/migrations/*{.ts,.js}'],
    migrationsTableName: 'migrations',
    synchronize: false,
    ssl: sslConfig,
    logging: isProduction ? ['error', 'warn'] : ['query', 'error', 'warn'],
    extra: {
        max: isProduction ? 20 : 10,
        min: isProduction ? 5 : 2,
        idleTimeoutMillis: isProduction ? 30000 : 10000,
    },
};

export const getTypeOrmConfig = (): TypeOrmModuleOptions => dataSourceConfig;

export default new DataSource(dataSourceConfig);
