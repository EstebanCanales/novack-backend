import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as net from 'net';
import * as fs from 'fs';
import * as path from 'path';
import { ElkConfig, getElkConfig } from './elk-config';

@Injectable()
export class LogTransportService implements OnModuleInit {
  private logstashClient: net.Socket | null = null;
  private fileTransport = false;
  private elkConfig: ElkConfig;
  private logDir: string;
  private currentLogStream: fs.WriteStream | null = null;
  private currentLogDate: string = '';

  constructor(private configService: ConfigService) {
    this.elkConfig = getElkConfig(configService);
    this.logDir = path.join(process.cwd(), 'logs');
    this.fileTransport = configService.get<string>('LOG_TO_FILE', 'true') === 'true';
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
      const [host, portStr] = this.elkConfig.elasticsearchHost.split(':');
      const port = parseInt(portStr.replace(/\D/g, '')) || 50000;
      
      this.logstashClient = new net.Socket();
      
      this.logstashClient.connect(port, host.replace(/^https?:\/\//, ''), () => {
        console.log(`Conectado a Logstash en ${host}:${port}`);
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