import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { DataSource, DataSourceOptions } from 'typeorm';

const dataSourceConfig: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME || 'kodus',
  password: process.env.DB_PASSWORD || 'kodus123',
  database: process.env.DB_DATABASE || 'kodus_mcp',
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/../database/migrations/*{.ts,.js}'],
  synchronize: false,
};

export const getTypeOrmConfig = (): TypeOrmModuleOptions => dataSourceConfig;

export default new DataSource(dataSourceConfig);
