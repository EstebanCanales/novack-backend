import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as net from 'net';
import * as fs from 'fs';
import * as path from 'path';
import { ElkConfig, getElkConfig } from './elk-config';
import * as os from 'os';

@Injectable()
export class LogTransportService implements OnModuleInit {
  private logstashClient: net.Socket | null = null;
  private fileTransport = false;
  private elkConfig: ElkConfig;
  private logDir: string;
  private currentLogStream: fs.WriteStream | null = null;
  private currentLogDate: string = '';

  constructor(private configService: ConfigService) {
    const environment = this.configService.get<string>('NODE_ENV', 'development');
    
    // Modificar el host de Logstash basado en el entorno
    const logstashHost = environment === 'development' && !process.env.DOCKER_CONTAINER
      ? 'localhost'
      : this.configService.get<string>('LOGSTASH_HOST', 'logstash');
    
    this.elkConfig = {
      enabled: this.configService.get<string>('ELK_ENABLED', 'false') === 'true',
      elasticsearchHost: this.configService.get<string>('ELASTICSEARCH_HOST', 'http://elasticsearch:9200'),
      logstashHost: logstashHost,
      logstashPort: parseInt(this.configService.get<string>('LOGSTASH_PORT', '50000')),
      applicationName: this.configService.get<string>('APP_NAME', 'novack-backend'),
      environment: environment
    };
    
    this.logDir = path.join(process.cwd(), 'logs');
    this.fileTransport = configService.get<string>('LOG_TO_FILE', 'true') === 'true';
    
    console.log(`Configuración de LogTransport: logstashHost=${this.elkConfig.logstashHost}, logstashPort=${this.elkConfig.logstashPort}, enabled=${this.elkConfig.enabled}`);
  }

  async onModuleInit() {
    if (this.fileTransport) {
      this.ensureLogDirectoryExists();
    }

    if (this.elkConfig.enabled) {
      this.connectToLogstash();
    }
  }

  private ensureLogDirectoryExists() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  private connectToLogstash() {
    try {
      const { logstashHost, logstashPort } = this.elkConfig;
      
      this.logstashClient = new net.Socket();
      
      this.logstashClient.connect(logstashPort, logstashHost, () => {
        console.log(`Conectado a Logstash en ${logstashHost}:${logstashPort}`);
      });

      this.logstashClient.on('error', (err) => {
        console.error(`Error en conexión con Logstash: ${err.message}`);
        this.logstashClient = null;
        
        // Reconectar después de 5 segundos
        setTimeout(() => this.connectToLogstash(), 5000);
      });

      this.logstashClient.on('close', () => {
        console.log('Conexión con Logstash cerrada');
        this.logstashClient = null;
        
        // Reconectar después de 5 segundos
        setTimeout(() => this.connectToLogstash(), 5000);
      });
    } catch (error) {
      console.error(`Error al conectar con Logstash: ${error.message}`);
    }
  }

  private getLogStream(): fs.WriteStream {
    const today = new Date().toISOString().split('T')[0];
    
    if (this.currentLogDate !== today || !this.currentLogStream) {
      if (this.currentLogStream) {
        this.currentLogStream.end();
      }
      
      this.currentLogDate = today;
      const logFilePath = path.join(this.logDir, `application-${today}.log`);
      this.currentLogStream = fs.createWriteStream(logFilePath, { flags: 'a' });
    }
    
    return this.currentLogStream;
  }

  sendLog(logData: any): void {
    const logWithMetadata = {
      ...logData,
      application: this.elkConfig.applicationName,
      environment: this.elkConfig.environment,
      hostname: require('os').hostname(),
      pid: process.pid,
    };

    const logString = JSON.stringify(logWithMetadata);

    // Enviar a Logstash si está habilitado
    if (this.elkConfig.enabled && this.logstashClient) {
      try {
        this.logstashClient.write(logString + '\n');
      } catch (error) {
        console.error(`Error al enviar log a Logstash: ${error.message}`);
      }
    }

    // Escribir en archivo si está habilitado
    if (this.fileTransport) {
      try {
        const logStream = this.getLogStream();
        logStream.write(logString + '\n');
      } catch (error) {
        console.error(`Error al escribir log en archivo: ${error.message}`);
      }
    }

    // Siempre mostrar en consola
    console.log(logString);
  }
} 