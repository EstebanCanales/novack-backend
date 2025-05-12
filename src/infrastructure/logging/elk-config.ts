import { ConfigService } from '@nestjs/config';

export interface ElkConfig {
  enabled: boolean;
  elasticsearchHost: string;
  applicationName: string;
  environment: string;
}

export const getElkConfig = (configService: ConfigService): ElkConfig => {
  return {
    enabled: configService.get<string>('ELK_ENABLED', 'false') === 'true',
    elasticsearchHost: configService.get<string>('ELK_HOST', 'http://localhost:9200'),
    applicationName: configService.get<string>('APP_NAME', 'novack-backend'),
    environment: configService.get<string>('NODE_ENV', 'development')
  };
}; 