import { DataSource } from 'typeorm';
import { config } from 'dotenv';

// Load environment variables
config();

export const testDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  entities: ['src/**/*.entity{.ts,.js}'],
  synchronize: true,
  logging: true,
});

export const initializeTestDatabase = async () => {
  try {
    await testDataSource.initialize();
    console.log('Test database connection has been established successfully.');
    return testDataSource;
  } catch (error) {
    console.error('Unable to connect to the test database:', error);
    throw error;
  }
};

export const closeTestDatabase = async () => {
  if (testDataSource.isInitialized) {
    await testDataSource.destroy();
    console.log('Test database connection has been closed.');
  }
};
