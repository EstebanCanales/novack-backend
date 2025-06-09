import { Test, TestingModule } from '@nestjs/testing';
import { CorrelationIdMiddleware } from './correlation-id.middleware';
import { StructuredLoggerService, LogContext } from './structured-logger.service';
import { Request, Response, NextFunction } from 'express';
import { AsyncLocalStorage } from 'async_hooks';

// Mock StructuredLoggerService and its static methods/properties
const mockAlsRun = jest.fn((context, callback) => callback());
const mockAlsGetStore = jest.fn();

// Mock the static getContextStorage to return our mock ALS
const mockGetContextStorage = jest.fn(() => ({
  run: mockAlsRun,
  getStore: mockAlsGetStore,
  enterWith: jest.fn(), // if used directly
  disable: jest.fn(), // if used directly
}));

// Keep the original createCorrelationId for testing its usage, or mock it if testing specific ID flow
// const originalCreateCorrelationId = StructuredLoggerService.createCorrelationId;

describe('CorrelationIdMiddleware', () => {
  let middleware: CorrelationIdMiddleware;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction = jest.fn();
  let originalStaticGetContextStorage;

  beforeAll(() => {
    // Override the static method before any instantiation of services that might use it
    originalStaticGetContextStorage = StructuredLoggerService.getContextStorage;
    Object.defineProperty(StructuredLoggerService, 'getContextStorage', {
        value: mockGetContextStorage,
        writable: true // Allow it to be restored
    });
  });

  afterAll(() => {
    // Restore original static method
     Object.defineProperty(StructuredLoggerService, 'getContextStorage', {
        value: originalStaticGetContextStorage,
    });
  });

  beforeEach(()_ => {
    // Reset mocks
    mockAlsRun.mockClear();
    mockAlsGetStore.mockClear();
    (nextFunction as jest.Mock).mockClear();
    mockGetContextStorage.mockClear(); // Clear calls to the getter itself

    // Setup default mock request/response for each test
    mockRequest = {
      headers: {},
    };
    mockResponse = {
      setHeader: jest.fn(),
    };

    // Middleware instance can be created directly as it has no constructor dependencies
    middleware = new CorrelationIdMiddleware();
  });

  it('should be defined', () => {
    expect(middleware).toBeDefined();
  });

  it('should generate a new correlationId if not in headers', () => {
    const createIdSpy = jest.spyOn(StructuredLoggerService, 'createCorrelationId');
    middleware.use(mockRequest as Request, mockResponse as Response, nextFunction);
    expect(createIdSpy).toHaveBeenCalled();
    expect(mockResponse.setHeader).toHaveBeenCalledWith('x-correlation-id', expect.any(String));
    createIdSpy.mockRestore();
  });

  it('should use existing correlationId from request headers', () => {
    const existingCorrId = 'existing-uuid-123';
    mockRequest.headers['x-correlation-id'] = existingCorrId;
    const createIdSpy = jest.spyOn(StructuredLoggerService, 'createCorrelationId');

    middleware.use(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(createIdSpy).not.toHaveBeenCalled();
    expect(mockResponse.setHeader).toHaveBeenCalledWith('x-correlation-id', existingCorrId);
    createIdSpy.mockRestore();
  });

  it('should set correlationId in response headers', () => {
    middleware.use(mockRequest as Request, mockResponse as Response, nextFunction);
    expect(mockResponse.setHeader).toHaveBeenCalledWith('x-correlation-id', expect.any(String));
  });

  it('should run next() in AsyncLocalStorage context', () => {
    middleware.use(mockRequest as Request, mockResponse as Response, nextFunction);
    expect(mockGetContextStorage).toHaveBeenCalled(); // Check if getContextStorage was called
    expect(mockAlsRun).toHaveBeenCalled();
    expect(nextFunction).toHaveBeenCalled();
  });

  it('should populate LogContext correctly (without user)', () => {
    mockRequest.method = 'GET';
    mockRequest.path = '/test/path';
    mockRequest.ip = '127.0.0.1';
    mockRequest.headers['user-agent'] = 'TestAgent';

    middleware.use(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(mockAlsRun).toHaveBeenCalledWith(
      expect.objectContaining({
        correlationId: expect.any(String),
        requestPath: '/test/path',
        method: 'GET',
        userAgent: 'TestAgent',
        ip: '127.0.0.1',
        userId: undefined // No user on request
      }),
      expect.any(Function)
    );
  });

  it('should populate LogContext with userId if req.user.id is present', () => {
    const userId = 'user-id-from-req';
    mockRequest.user = { id: userId }; // As per middleware logic for req.user.id

    middleware.use(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(mockAlsRun).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: userId,
      }),
      expect.any(Function)
    );
  });

  it('should populate LogContext with userId if req.user.userId is present', () => {
    const userId = 'user-id-from-req-userId';
    mockRequest.user = { userId: userId }; // As per middleware logic for req.user.userId

    middleware.use(mockRequest as Request, mockResponse as Response, nextFunction);

    expect(mockAlsRun).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: userId,
      }),
      expect.any(Function)
    );
  });

  // TODO: Add more tests, e.g., for different types of correlation-id in header (array, etc. if applicable)
});
