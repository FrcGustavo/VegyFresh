import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { ConfigService } from '@nestjs/config';
import { join } from 'path';

config();
const configService = new ConfigService();

const postgresHost = configService.get<string>('POSTGRES_HOST');
const postgresPort = Number(configService.get<string>('POSTGRES_PORT'));
const postgresUser = configService.get<string>('POSTGRES_USER');
const postgresPassword = configService.get<string>('POSTGRES_PASSWORD');
const postgresDatabase = configService.get<string>('POSTGRES_DB');

const missingEnvVars = [
  ['POSTGRES_HOST', postgresHost],
  [
    'POSTGRES_PORT',
    Number.isNaN(postgresPort) ? undefined : String(postgresPort),
  ],
  ['POSTGRES_USER', postgresUser],
  ['POSTGRES_PASSWORD', postgresPassword],
  ['POSTGRES_DB', postgresDatabase],
].filter(([, value]) => !value);

if (missingEnvVars.length > 0) {
  throw new Error(
    `Missing required environment variables for database connection: ${missingEnvVars
      .map(([name]) => name)
      .join(', ')}`,
  );
}

export default new DataSource({
  type: 'postgres',
  username: postgresUser,
  password: postgresPassword,
  database: postgresDatabase,
  port: postgresPort,
  host: postgresHost,
  synchronize: false,
  logging: true,
  connectTimeoutMS: 5000,
  entities: [join(__dirname, '..', '**', '*.entity.{ts,js}')],
  migrations: [join(__dirname, 'migrations', '*.{ts,js}')],
  migrationsTableName: 'migrations',
});
