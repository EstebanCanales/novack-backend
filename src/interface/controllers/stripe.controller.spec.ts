import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { StripeController } from './stripe.controller';
import { StripeService } from '../../application/services/stripe.service';
import { StructuredLoggerService } from '../../infrastructure/logging/structured-logger.service';
import { HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';

// Mocks
const mockStripeService = {
  createCheckoutSession: jest.fn(),
  handleWebhookEvent: jest.fn(),
};

const mockConfigService = {
  get: jest.fn((key: string) => {
    if (key === 'CLIENT_APP_URL') return 'http://localhost:3001';
    return null;
  }),
};

const mockLoggerService = {
  setContext: jest.fn(),
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
};

describe('StripeController', () => {
  let controller: StripeController;
  let stripeService: typeof mockStripeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StripeController],
      providers: [
        { provide: StripeService, useValue: mockStripeService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: StructuredLoggerService, useValue: mockLoggerService },
      ],
    }).compile();

    controller = module.get<StripeController>(StripeController);
    stripeService = module.get<typeof mockStripeService>(StripeService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('POST /checkout/session', () => {
    let mockResponse: Partial<Response>;

    beforeEach(() => {
        mockResponse = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
        };
    });

    it('should successfully create a checkout session and return session ID', async () => {
      const checkoutDto = { supplierId: 'sup_123', priceId: 'price_abc' };
      const sessionMock = { id: 'cs_test_session_id' };
      stripeService.createCheckoutSession.mockResolvedValueOnce(sessionMock as any);

      await controller.createCheckoutSession(checkoutDto, mockResponse as Response);

      expect(stripeService.createCheckoutSession).toHaveBeenCalledWith(
        checkoutDto.supplierId,
        checkoutDto.priceId,
        'http://localhost:3001/payment/success?session_id={CHECKOUT_SESSION_ID}',
        'http://localhost:3001/payment/cancel',
      );
      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.CREATED);
      expect(mockResponse.json).toHaveBeenCalledWith({ sessionId: sessionMock.id });
      // TODO: Add more detailed assertions
    });

    it('should return 400 if supplierId or priceId is missing', async () => {
      await controller.createCheckoutSession({ supplierId: '', priceId: 'price_abc' }, mockResponse as Response);
      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: 'supplierId and priceId are required.' });

      await controller.createCheckoutSession({ supplierId: 'sup_123', priceId: '' }, mockResponse as Response);
      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: 'supplierId and priceId are required.' });
      // TODO: Add more detailed assertions
    });

    it('should return 500 if stripeService.createCheckoutSession throws an error', async () => {
      const checkoutDto = { supplierId: 'sup_123', priceId: 'price_abc' };
      stripeService.createCheckoutSession.mockRejectedValueOnce(new Error('Service error'));

      await controller.createCheckoutSession(checkoutDto, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(mockResponse.json).toHaveBeenCalledWith({ message: 'Failed to create checkout session.' });
      // TODO: Add more detailed assertions
    });
  });

  describe('POST /webhook', () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;

    beforeEach(() => {
        mockRequest = {
            headers: {},
        };
        mockResponse = {
            status: jest.fn().mockReturnThis(),
            send: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
        };
    });

    it('should successfully process a valid webhook event', async () => {
      mockRequest.headers['stripe-signature'] = 'valid_signature';
      (mockRequest as any).rawBody = Buffer.from('{"event": "test"}');
      stripeService.handleWebhookEvent.mockResolvedValueOnce({ id: 'evt_test', type: 'test.event' } as any);

      await controller.handleWebhook('valid_signature', mockRequest as Request, mockResponse as Response);

      expect(stripeService.handleWebhookEvent).toHaveBeenCalledWith(Buffer.from('{"event": "test"}'), 'valid_signature');
      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.OK);
      expect(mockResponse.json).toHaveBeenCalledWith({ received: true });
      // TODO: Add more detailed assertions
    });

    it('should return 400 if stripe-signature is missing', async () => {
      (mockRequest as any).rawBody = Buffer.from('{"event": "test"}');
      await controller.handleWebhook(undefined, mockRequest as Request, mockResponse as Response);
      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.send).toHaveBeenCalledWith('Missing Stripe signature.');
      // TODO: Add more detailed assertions
    });

    it('should return 500 if req.rawBody is not available', async () => {
        mockRequest.headers['stripe-signature'] = 'valid_signature';
        (mockRequest as any).rawBody = undefined; // Simulate rawBody not being available
        await controller.handleWebhook('valid_signature', mockRequest as Request, mockResponse as Response);
        expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
        expect(mockResponse.send).toHaveBeenCalledWith('Server configuration error for raw body.');
        // TODO: Add more detailed assertions
    });

    it('should return 400 if StripeService throws StripeSignatureVerificationError', async () => {
      mockRequest.headers['stripe-signature'] = 'invalid_signature';
      (mockRequest as any).rawBody = Buffer.from('{"event": "test"}');
      const sigError = new Error('Signature verification failed');
      (sigError as any).type = 'StripeSignatureVerificationError';
      stripeService.handleWebhookEvent.mockRejectedValueOnce(sigError);

      await controller.handleWebhook('invalid_signature', mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.send).toHaveBeenCalledWith('Webhook Error: Signature verification failed');
      // TODO: Add more detailed assertions
    });

    it('should return 500 if StripeService throws other errors', async () => {
      mockRequest.headers['stripe-signature'] = 'valid_signature';
      (mockRequest as any).rawBody = Buffer.from('{"event": "test"}');
      stripeService.handleWebhookEvent.mockRejectedValueOnce(new Error('Some other service error'));

      await controller.handleWebhook('valid_signature', mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(mockResponse.send).toHaveBeenCalledWith('Webhook Error: Some other service error');
      // TODO: Add more detailed assertions
    });
  });
});
