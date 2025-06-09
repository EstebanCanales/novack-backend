import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { LogTransportService } from './log-transport.service';
import * as net from 'net';
import * as fs from 'fs';
import * as path from 'path';

// Mock the 'net' module
jest.mock('net', () => ({
  Socket: jest.fn().mockImplementation(() => ({
    connect: jest.fn(),
    on: jest.fn(),
    write: jest.fn(),
    destroy: jest.fn(),
    setTimeout: jest.fn(),
    writable: true, // Default to writable for some tests
  })),
}));

// Mock 'fs' module for file operations
jest.mock('fs', () => ({
  ...jest.requireActual('fs'), // Import and retain default behavior
  existsSync: jest.fn(),
  mkdirSync: jest.fn(),
  createWriteStream: jest.fn().mockImplementation(() => ({
    write: jest.fn(),
    end: jest.fn(),
    on: jest.fn(),
  })),
}));


describe('LogTransportService', () => {
  let service: LogTransportService;
  let mockConfigService: ConfigService;
  let mockSocket: net.Socket;
  let mockWriteStream: fs.WriteStream;

  beforeEach(async () => {
    // Reset mocks
    (fs.existsSync as jest.Mock).mockReset();
    (fs.mkdirSync as jest.Mock).mockReset();
    (fs.createWriteStream as jest.Mock).mockImplementation(() => ({
        write: jest.fn(),
        end: jest.fn(),
        on: jest.fn(),
      }));

    // Create a fresh mock socket for each test to reset its jest.fn() calls
    mockSocket = new (net.Socket as any)() as jest.Mocked<net.Socket>;
    (net.Socket as jest.Mock).mockImplementation(() => mockSocket);


    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LogTransportService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => {
              // Default mock implementations for ConfigService
              if (key === 'ELK_ENABLED') return 'false';
              if (key === 'LOG_TO_FILE') return 'false';
              if (key === 'LOG_FALLBACK_CONSOLE') return 'true';
              if (key === 'LOGSTASH_HOST') return 'localhost';
              if (key === 'LOGSTASH_PORT') return '50000';
              if (key === 'APP_NAME') return 'test-app';
              if (key === 'NODE_ENV') return 'test';
              if (key === 'ELK_FAIL_SAFE') return 'true';
              return defaultValue;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<LogTransportService>(LogTransportService);
    mockConfigService = module.get<ConfigService>(ConfigService);
    mockWriteStream = (fs.createWriteStream as jest.Mock).mock.results[0]?.value; // Get the instance
  });

  afterEach(() => {
    jest.clearAllMocks(); // Clear all mocks after each test
    if (service['reconnectTimeout']) {
      clearTimeout(service['reconnectTimeout']);
    }
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Initialization', () => {
    it('should not connect to Logstash if ELK_ENABLED is false', () => {
      expect(mockSocket.connect).not.toHaveBeenCalled();
    });

    it('should attempt to connect to Logstash if ELK_ENABLED is true', async () => {
      (mockConfigService.get as jest.Mock).mockImplementation((key: string) => {
        if (key === 'ELK_ENABLED') return 'true';
        return 'test'; // default for others
      });
      const newService = new LogTransportService(mockConfigService);
      // Use setImmediate to allow async operations in onModuleInit to proceed
      await new Promise(setImmediate);
      expect(mockSocket.connect).toHaveBeenCalled();
    });

    it('should create log directory if LOG_TO_FILE is true and directory does not exist', () => {
      (mockConfigService.get as jest.Mock).mockImplementation((key: string) => {
        if (key === 'LOG_TO_FILE') return 'true';
        return 'test';
      });
      (fs.existsSync as jest.Mock).mockReturnValue(false);
      const newService = new LogTransportService(mockConfigService);
      newService.onModuleInit();
      expect(fs.mkdirSync).toHaveBeenCalledWith(expect.any(String), { recursive: true });
    });

    it('should not create log directory if LOG_TO_FILE is true and directory already exists', () => {
        (mockConfigService.get as jest.Mock).mockImplementation((key: string) => {
          if (key === 'LOG_TO_FILE') return 'true';
          return 'test';
        });
        (fs.existsSync as jest.Mock).mockReturnValue(true);
        const newService = new LogTransportService(mockConfigService);
        newService.onModuleInit();
        expect(fs.mkdirSync).not.toHaveBeenCalled();
      });
  });

  describe('Log Sending', () => {
    const logData = { message: 'test log', level: 'info', timestamp: new Date().toISOString() };

    it('should send log to console if fallback is enabled and no other transports are active', () => {
      const consoleSpy = jest.spyOn(console, 'log');
      service.sendLog(logData);
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining(logData.message));
      consoleSpy.mockRestore();
    });

    it('should write to file if LOG_TO_FILE is true', () => {
        (mockConfigService.get as jest.Mock).mockImplementation((key: string) => {
          if (key === 'LOG_TO_FILE') return 'true';
          if (key === 'LOG_FALLBACK_CONSOLE') return 'false'; // Disable console to isolate file log
          return 'test';
        });
        const fileService = new LogTransportService(mockConfigService);
        fileService.onModuleInit(); // To setup writestream
        fileService.sendLog(logData);
        // Need to get the mock writestream instance that was created for this service instance
        const currentMockWriteStream = (fs.createWriteStream as jest.Mock).mock.results.find(r => r.type === 'return')?.value;
        expect(currentMockWriteStream.write).toHaveBeenCalledWith(expect.stringContaining(logData.message) + '\n');
      });

    // More tests for Logstash connection, queuing, errors, retries, etc.
  });

  // TODO: Add detailed tests for Logstash connection logic (success, error, timeout, close, reconnect attempts)
  // TODO: Add tests for log queuing when Logstash is disconnected and processing upon reconnection
  // TODO: Add tests for file rotation (might require mocking date/time)
  // TODO: Add tests for getStats() method
  // TODO: Test onModuleDestroy to ensure client and stream cleanup

});
