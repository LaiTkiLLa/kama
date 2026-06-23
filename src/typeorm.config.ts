import { DataSource } from 'typeorm';
import { config as dotenvConfig } from 'dotenv';
import * as process from 'node:process';

dotenvConfig({ path: '.env' });

export const TypeOrmDataSource = new DataSource({
  type: 'postgres',
  host: process.env.POSTGRES_HOST,
  port: Number(process.env.POSTGRES_PORT),
  username: process.env.POSTGRES_USER,
  password: process.env.POSTGRES_PASSWORD,
  database: process.env.POSTGRES_DB,
  synchronize: false,
  migrationsTransactionMode: 'none',
  logging: false,
  entities: ['dist/**/*.entity{.ts,.js}'],
  migrations: ['database/migrations/*{.ts,.js}']
});
