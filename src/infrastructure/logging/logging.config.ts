import { registerAs } from '@nestjs/config';

export default registerAs('logging', () => ({
  level: process.env.LOG_LEVEL || 'info',
  fileEnabled: process.env.LOG_TO_FILE === 'true',
  elk: {
    enabled: process.env.ELK_ENABLED === 'true',
    host: process.env.ELK_HOST || 'http://localhost:9200',
  },
  application: {
    name: process.env.APP_NAME || 'novack-backend',
    environment: process.env.NODE_ENV || 'development',
  },
})); 