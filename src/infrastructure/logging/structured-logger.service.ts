import { Injectable, LoggerService, Scope } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AsyncLocalStorage } from 'async_hooks';
import { v4 as uuidv4 } from 'uuid';
import { LogTransportService } from './log-transport.service';

export interface LogContext {
  correlationId?: string;
  userId?: string;
  requestPath?: string;
  [key: string]: any;
}

@Injectable({ scope: Scope.TRANSIENT })
export class StructuredLoggerService implements LoggerService {
  private static contextStorage = new AsyncLocalStorage<LogContext>();
  private context?: string;
  private static logLevel: 'debug' | 'info' | 'warn' | 'error' = 'info';
  private static logTransport: LogTransportService;

  constructor(
    private configService?: ConfigService,
    logTransport?: LogTransportService
  ) {
    if (this.configService) {
      StructuredLoggerService.logLevel = this.configService.get<'debug' | 'info' | 'warn' | 'error'>('LOG_LEVEL', 'info');
    }
    if (logTransport) {
      StructuredLoggerService.logTransport = logTransport;
    }
  }

  static getContextStorage(): AsyncLocalStorage<LogContext> {
    return this.contextStorage;
  }

  static createCorrelationId(): string {
    return uuidv4();
  }

  static getCurrentContext(): LogContext {
    return this.contextStorage.getStore() || {};
  }

  static setContext(context: LogContext): void {
    const currentContext = this.contextStorage.getStore() || {};
    this.contextStorage.enterWith({ ...currentContext, ...context });
  }

  setContext(context: string): void {
    this.context = context;
  }

  private formatLog(level: string, message: any, context?: string, ...meta: any[]): any {
    const currentContext = StructuredLoggerService.getCurrentContext();
    const timestamp = new Date().toISOString();
    const contextName = context || this.context || 'Global';
    const correlationId = currentContext.correlationId || 'no-correlation-id';

    // Estructurar el log en formato JSON para ELK/Grafana
    return {
      timestamp,
      level,
      message: typeof message === 'object' ? JSON.stringify(message) : message,
      context: contextName,
      correlationId,
      ...currentContext,
      meta: meta.length ? meta : undefined,
    };
  }

  private sendLog(level: string, formattedLog: any): void {
    if (StructuredLoggerService.logTransport) {
      StructuredLoggerService.logTransport.sendLog(formattedLog);
    } else {
      // Fallback a console si no hay transporte configurado
      console.log(JSON.stringify(formattedLog));
    }
  }

  log(message: any, context?: string, ...meta: any[]): void {
    if (['debug', 'info', 'warn', 'error'].includes(StructuredLoggerService.logLevel)) {
      const formattedLog = this.formatLog('info', message, context, ...meta);
      this.sendLog('info', formattedLog);
    }
  }

  debug(message: any, context?: string, ...meta: any[]): void {
    if (['debug'].includes(StructuredLoggerService.logLevel)) {
      const formattedLog = this.formatLog('debug', message, context, ...meta);
      this.sendLog('debug', formattedLog);
    }
  }

  warn(message: any, context?: string, ...meta: any[]): void {
    if (['debug', 'info', 'warn', 'error'].includes(StructuredLoggerService.logLevel)) {
      const formattedLog = this.formatLog('warn', message, context, ...meta);
      this.sendLog('warn', formattedLog);
    }
  }

  error(message: any, context?: string, trace?: string, ...meta: any[]): void {
    if (['debug', 'info', 'warn', 'error'].includes(StructuredLoggerService.logLevel)) {
      const formattedLog = this.formatLog('error', message, context, ...[...meta, { trace }]);
      this.sendLog('error', formattedLog);
    }
  }

  verbose(message: any, context?: string, ...meta: any[]): void {
    if (['debug'].includes(StructuredLoggerService.logLevel)) {
      const formattedLog = this.formatLog('verbose', message, context, ...meta);
      this.sendLog('verbose', formattedLog);
    }
  }
} 